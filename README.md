# Etereal Wedding Market

Burmese-first storefront with an English switch, bilingual search, rental date selection, and guest checkout for cash-on-delivery orders.

The GitHub Pages build lives in `docs/`. In repository Settings → Pages, choose **Deploy from a branch**, select **main** and **/docs**, then save.

To develop locally, run `npm install` and `npm run dev`. After editing the storefront, run `npm run build` and commit the regenerated `docs/` files.

The customer submits their name, phone number, delivery address and COD acknowledgment to the hosted Etereal order API. The storefront keeps language and bag preferences in the browser and clears the bag after a confirmed submission.

Studio staff can sign in to the [COD order queue](https://etereal-wedding-market.the-studioeternelle.chatgpt.site/admin/orders) to contact customers and schedule delivery in Japan time.
