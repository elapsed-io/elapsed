# The recipes the site ships

The eight built-in recipes as the site builds and draws them, with the schema it checks them against
(`../schema/mode-recipe-1.schema.json`). They are the round 2.11 recipes, unchanged.

`docs/recipes/` holds the owner's recipe archive of 2026-11-24 (`recipe-check.py`, the schema, the guide and
the eight recipes it generates). That archive was written from an earlier copy of the recipes: for the standard
modes it predates the frames the site is built to (the analog redesign of round 2.8; ring's and timeline's
48 px time in plan version 12), and it adds the cinematic and idle-screen fields (`scenery`, `subject`, `glare`,
`camera: rig`, `freeze`, `idle`, `dim`, `scale`, `beam`, `visibility`) that the site does not draw yet.

So the site keeps these copies until the two are reconciled field by field, as `docs/release-readiness.md`
orders it: the frames and the plan win for the standard modes; the archive's additions come in with the rounds
that build them. Until then a change to a built-in recipe is made here and, if it is the owner's, in
`docs/recipes/` too.
