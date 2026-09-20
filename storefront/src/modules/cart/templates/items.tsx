import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="font-display text-2xl text-evergreen-800">
          Cart
        </Heading>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header className="border-t-0">
            <Table.Row className="text-ink-muted">
              <Table.HeaderCell className="!pl-0 text-sm font-medium">
                Item
              </Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
              <Table.HeaderCell className="text-sm font-medium">
                Quantity
              </Table.HeaderCell>
              <Table.HeaderCell className="hidden small:table-cell text-sm font-medium">
                Price
              </Table.HeaderCell>
              <Table.HeaderCell className="!pr-0 text-right text-sm font-medium">
                Total
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items
              ? items
                  .sort((a, b) => {
                    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  })
                  .map((item) => {
                    return (
                      <Item
                        key={item.id}
                        item={item}
                        currencyCode={cart?.currency_code}
                      />
                    )
                  })
              : repeat(5).map((i) => {
                  return <SkeletonLineItem key={i} />
                })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

export default ItemsTemplate
