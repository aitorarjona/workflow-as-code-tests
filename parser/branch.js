function* chain(context) {
  const x = yield context.df.callActivity("F1");

  if (x) {
    const y = yield context.df.callActivity("F2A", x);
  } else {
    const y = yield context.df.callActivity("F2B", x);
  }

  return yield context.df.callActivity("F3", y);
}

function* chain_0(context) {
  const x = context.df.callActivity("F1");
  return x;
}

function* chain_1(context, x) {
  if (x) {
    const y = context.df.callActivity("F2A", x);
    return y;
  } else {
    const y = context.df.callActivity("F2B", x);
    return y;
  }
}

function* chain_2(context, y) {
  return context.df.callActivity("F3", y);
}
