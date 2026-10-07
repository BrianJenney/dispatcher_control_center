const effectHooks = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);

function calleeName(callee) {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return null;
}

function isInsideEffect(context, node) {
  return context.sourceCode
    .getAncestors(node)
    .some((ancestor) => ancestor.type === "CallExpression" && effectHooks.has(calleeName(ancestor.callee)));
}

const noFetchInEffect = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      effectFetch:
        "Do not load data in an effect. Read with a query in src/server/queries and poll it with useLiveQuery.",
    },
  },
  create(context) {
    function check(node) {
      if (isInsideEffect(context, node)) context.report({ node, messageId: "effectFetch" });
    }
    return {
      AwaitExpression: check,
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name === "fetch" || name === "then") check(node);
      },
    };
  },
};

export default noFetchInEffect;
