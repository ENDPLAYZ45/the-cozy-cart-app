# Direct Product Image Framing QA

## Storage decision

Firebase Console confirms that the connected project requires a billing-plan upgrade before Firebase Storage can be enabled. The user elected not to upgrade. No bucket, Storage rules, billing changes, or file uploads were created.

## Admin workflow

The product editor now keeps the optional direct **Product image URL** field and adds a live framed preview beneath it. The preview uses the same cover behavior as Signal’s product cards. Horizontal and vertical sliders save a focal position from 0–100%; the product payload stores those values with the image URL.

## Storefront behavior

The catalog mapper forwards the saved focal position to product cards and cart thumbnails through CSS `object-position`. An authenticated review used the existing Sony image path in an unsaved product dialog: the image appeared immediately in the preview, while no product record was created or modified. The Storage upload action is absent from the final editor. All 31 tests, TypeScript checking, and the production build passed.

## Regression coverage

The test suite now starts with a Firebase-style product record containing `imageFocusX: 72` and `imageFocusY: 31`, maps it through `toCatalogProduct`, renders the public `ProductCard`, and asserts that the image emits the exact CSS `object-position: 72% 31%`. This verifies the stored-data-to-storefront rendering path without altering a live Firebase product only for validation. The final URL-only workflow passed 32 tests, TypeScript checking, and a production build.
