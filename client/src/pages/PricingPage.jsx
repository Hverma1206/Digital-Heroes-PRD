import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createRazorpayOrder, getPlans, verifyRazorpayPayment } from '../services/subscriptionService'

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

function PricingPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingPlanCode, setProcessingPlanCode] = useState('')

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await getPlans()
        setPlans(payload?.plans || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load subscription plans right now.')
      } finally {
        setLoading(false)
      }
    }

    loadPlans()
  }, [])

  const handleGetStarted = async (planCode) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } })
      return
    }

    setProcessingPlanCode(planCode)

    try {
      const payload = await createRazorpayOrder(planCode)

      if (payload?.bypass) {
        await refreshUser()
        addToast('Test bypass active: subscription activated without payment.', 'success')
        navigate('/dashboard', { replace: true })
        setProcessingPlanCode('')
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout.')
      }

      const key = payload?.razorpayKeyId
      const order = payload?.order

      if (!key || !order?.id) {
        throw new Error(payload?.message || 'Razorpay order details were not returned by server.')
      }

      const razorpay = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Charity Subscription Platform',
        description: `${planCode} subscription`,
        prefill: {
          email: user?.email,
        },
        theme: {
          color: '#0f766e',
        },
        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              planCode,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            await refreshUser()
            addToast('Subscription activated successfully.', 'success')
            navigate('/dashboard', { replace: true })
          } catch (err) {
            addToast(err?.response?.data?.message || err.message || 'Payment verification failed.', 'error')
          } finally {
            setProcessingPlanCode('')
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPlanCode('')
          },
        },
      })

      razorpay.open()
    } catch (err) {
      addToast(err?.response?.data?.message || err.message || 'Unable to start checkout.', 'error')
      setProcessingPlanCode('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Pricing</p>
        <h1 className="mt-2 font-display text-4xl text-white">Subscription Plans</h1>
        <p className="mt-3 text-sm text-slate-300">
          Choose a plan and continue to subscription from your dashboard after login.
        </p>

        {error && (
          <p className="mt-5 rounded-2xl border border-rose-700 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-300">Loading plans...</p>
        ) : plans.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            No plans configured yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plans.map((plan) => {
              const isProcessing = processingPlanCode === plan.code
              return (
                <article key={plan.id || plan.code} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{plan.billing_cycle}</p>
                  <h2 className="mt-2 font-display text-2xl text-white">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-semibold text-teal-300">
                    Rs. {Number(plan.price_inr).toLocaleString('en-IN')}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    Minimum charity contribution: {plan.charity_min_percent}%
                  </p>

                  <button
                    className="btn btn-primary mt-6 w-full"
                    disabled={isProcessing}
                    onClick={() => handleGetStarted(plan.code)}
                  >
                    {isProcessing ? 'Opening checkout...' : 'Get Started'}
                  </button>
                </article>
              )
            })}
          </div>
        )}

        <p className="mt-8 text-sm text-slate-400">
          Secure payment is processed via Razorpay order + signature verification.
        </p>
      </section>
    </main>
  )
}

export default PricingPage
