import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { formatDate } from "@lib/util/dates"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div data-testid="overview-page-wrapper">
      <div className="hidden small:block">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-display text-xl text-evergreen-800">
          <span data-testid="welcome-message" data-value={customer?.first_name}>
            Hello {customer?.first_name}
          </span>
          <span className="font-body text-sm text-ink-muted">
            Signed in as:{" "}
            <span
              className="font-semibold text-ink"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </span>
        </div>
        <div className="flex flex-col border-t border-line py-8">
          <div className="col-span-1 row-span-2 flex h-full flex-1 flex-col gap-y-4">
            <div className="mb-6 flex flex-wrap items-start gap-x-10 gap-y-6">
              <div className="flex flex-col gap-y-4">
                <h3 className="font-display text-lg text-evergreen-800">
                  Profile
                </h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="font-display text-3xl leading-none text-evergreen-800"
                    data-testid="customer-profile-completion"
                    data-value={getProfileCompletion(customer)}
                  >
                    {getProfileCompletion(customer)}%
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-evergreen-600">
                    Completed
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-y-4">
                <h3 className="font-display text-lg text-evergreen-800">
                  Addresses
                </h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="font-display text-3xl leading-none text-evergreen-800"
                    data-testid="addresses-count"
                    data-value={customer?.addresses?.length || 0}
                  >
                    {customer?.addresses?.length || 0}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-evergreen-600">
                    Saved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-2">
                <h3 className="font-display text-lg text-evergreen-800">
                  Recent orders
                </h3>
              </div>
              <ul
                className="flex flex-col gap-y-4"
                data-testid="orders-wrapper"
              >
                {orders && orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => {
                    return (
                      <li
                        key={order.id}
                        data-testid="order-wrapper"
                        data-value={order.id}
                      >
                        <LocalizedClientLink
                          href={`/account/orders/details/${order.id}`}
                        >
                          <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 shadow-sm transition-colors hover:border-line-strong sm:p-5">
                            <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-x-4 text-sm">
                              <span className="font-semibold text-ink">
                                Date placed
                              </span>
                              <span className="font-semibold text-ink">
                                Order number
                              </span>
                              <span className="font-semibold text-ink">
                                Total amount
                              </span>
                              <span
                                className="text-ink-muted"
                                data-testid="order-created-date"
                              >
                                {formatDate(order.created_at)}
                              </span>
                              <span
                                className="text-ink-muted"
                                data-testid="order-id"
                                data-value={order.display_id}
                              >
                                #{order.display_id}
                              </span>
                              <span
                                className="text-ink-muted"
                                data-testid="order-amount"
                              >
                                {convertToLocale({
                                  amount: order.total,
                                  currency_code: order.currency_code,
                                })}
                              </span>
                            </div>
                            <button
                              className="flex items-center justify-between text-ink-muted"
                              data-testid="open-order-button"
                            >
                              <span className="sr-only">
                                Go to order #{order.display_id}
                              </span>
                              <ChevronDown className="-rotate-90" />
                            </button>
                          </div>
                        </LocalizedClientLink>
                      </li>
                    )
                  })
                ) : (
                  <span
                    className="text-sm text-ink-muted"
                    data-testid="no-orders-message"
                  >
                    No recent orders
                  </span>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
