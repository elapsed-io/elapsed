# The recipes the site ships

The eight built-in recipes as the site builds and draws them, with the schema it checks them against
(`../schema/mode-recipe-1.schema.json`).

`docs/recipes/` holds the owner's recipe archive: `recipe-check.py`, the guide, and the schema and eight recipes the
checker writes. Since round 2.13 the two are one for the standard modes: for digits, ring, timeline and analog the
frames are the source of truth (plan version 13), so the corrected recipes were written back into the checker,
which wrote them into the archive, and these four files are copies of the archive's (a test fails if they differ).

The test modes' recipes differ on purpose: the archive carries additions the site does not draw yet (ocean depth's
calm water, height's falcon and its cinematic pieces), which come in with the rounds that build them (2.18 and
2.19), and the site's copies carry what rounds 2.9 to 2.11 changed. The site's schema is the narrower of the two
(only what its pieces draw); every recipe here also passes the archive's schema (tested).

A change to a standard recipe is made in `recipe-check.py`, run, and copied here from the archive.
