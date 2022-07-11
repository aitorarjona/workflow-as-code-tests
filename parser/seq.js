function* chain(context) {
  try {
    const x = yield context.df.callActivity("F1");
    const y = yield context.df.callActivity("F2", x);
    const z = yield context.df.callActivity("F3", y);
    return yield context.df.callActivity("F4", z);
  } catch (error) {
    // Error handling or compensation goes here.
  }
}

function* chain_0(context) {
  try {
    const x = context.df.callActivity("F1");
    return x;
  } catch (error) {
    // Error handling or compensation goes here.
  }
}

function* chain_1(context, x) {
  try {
    const y = context.df.callActivity("F2", x);
    return y;
  } catch (error) {
    // Error handling or compensation goes here.
  }
}

function* chain_2(context, y) {
  try {
    const z = context.df.callActivity("F3", y);
    return z;
  } catch (error) {
    // Error handling or compensation goes here.
  }
}

function* chain_3(context, z) {
  try {
    return context.df.callActivity("F4", z);
  } catch (error) {
    // Error handling or compensation goes here.
  }
}
