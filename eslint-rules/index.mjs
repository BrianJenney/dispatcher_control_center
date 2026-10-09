import noComments from "./no-comments.mjs";
import noFetchInEffect from "./no-fetch-in-effect.mjs";
import noHardcodedSecrets from "./no-hardcoded-secrets.mjs";
import queriesCheckSession from "./queries-check-session.mjs";

const local = {
  meta: { name: "dispatch-local" },
  rules: {
    "no-comments": noComments,
    "no-fetch-in-effect": noFetchInEffect,
    "no-hardcoded-secrets": noHardcodedSecrets,
    "queries-check-session": queriesCheckSession,
  },
};

export default local;
