# Featured Product Image Loading QA

## Loading strategy

All three rotating spotlight assets are now elevated to browser image preloads. The homepage also creates image preload objects and waits for each source to load and finish `decode()` before automatic rotation can switch to it.

## Non-blank fallback

While an image is pending, the product stage retains its editorial circle treatment and shows a branded **Preparing product visual** state rather than an empty white rectangle. An unavailable asset receives a clear, non-deceptive unavailable label.

## Responsive review

Desktop and mobile homepage checks show the Sony visual rendered immediately in the featured stage, with no blank image area. The automated homepage test stubs decoded preloads and confirms rotation remains functional; the complete suite, type checking, and production build passed.
