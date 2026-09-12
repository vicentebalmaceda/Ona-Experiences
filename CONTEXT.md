# ONA Experiences

Marketplace context for lodges and guides listed from BSale, with ONA-owned guest feedback.

## Language

**Product**:
ONA's catalog record of a lodge or guide offer. It has its own id. BSale's product id plus catalog type (lodge or guide) are the external key used to sync it, not the id Reviews point at. A Product can be marked inactive when it is no longer offered; its Reviews remain.
_Avoid_: Listing, SKU (that is the Variant), web product, treating BSale `productId` as the Product

**Variant**:
A sellable SKU under a Product, mirrored from a BSale variant. A Review is of the Product, not of the Variant. A Review Invite may remember which Variant was booked.
_Avoid_: Product, package (informal only)

**Review**:
A verified guest judgment of a Product: an overall score from 1 to 5 stars and a short required comment. Created only by redeeming a Review Invite; it cannot be edited after submit. Public attribution is first name plus last initial.
_Avoid_: Rating (alone), reseña del perfil (that is product description HTML), testimonial

**Visible Review**:
A Review that an admin has not hidden. Only Visible Reviews form a Product's public average, count, and comment list — on the detail page, directory cards, and map alike.
_Avoid_: Published review (implies an approval queue), seed rating, local rating

**Review Invite**:
A one-time, manually issued permission, delivered by Spanish email, for a known Customer to submit exactly one Review for a specific Product. It expires 30 days after it is issued. Sending another invite for the same Customer and Product revokes any unused prior invite. It may optionally remember a BSale document id and the booked Variant for the admin's bookkeeping.
_Avoid_: Magic link (implementation), survey, open form, automatic post-quote invite

**Customer**:
The person ONA communicates with for quotes and Review Invites (name + email from the booking/quote flow).
_Avoid_: Client (BSale’s `/clients` record), User (no end-user accounts in v1), guest (informal only)

**Quote**:
A pre-sale BSale document (cotización) created for a Customer against a Product variant.
_Avoid_: Sale (API path name only today), Order, Booking (not modeled yet)
