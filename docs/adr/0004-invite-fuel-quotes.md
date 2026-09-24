# Quotes are invite-ready snapshots in Postgres

When a BSale cotización webhook is invite-ready (exactly one line with product and variant, Customer email present), ONA persists a Quote row keyed by BSale document id. Incomplete cotizaciones are not stored; Review Invites always resolve from that snapshot first, then BSale.
