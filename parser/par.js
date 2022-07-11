function* fan_out_fan_in(context) {
  const parallelTasks = [];

  // Get a list of N work items to process in parallel.
  const workBatch = yield context.df.callActivity("F1");
  for (let i = 0; i < workBatch.length; i++) {
    parallelTasks.push(context.df.callActivity("F2", workBatch[i]));
  }

  yield context.df.Task.all(parallelTasks);

  // Aggregate all N outputs and send the result to F3.
  const sum = parallelTasks.reduce((prev, curr) => prev + curr, 0);
  yield context.df.callActivity("F3", sum);
}

function* fan_out_fan_in_0(context) {
  const parallelTasks = [];

  const workBatch = context.df.callActivity("F1");
  return workBatch;
}

function* fan_out_fan_in_1(context, parallelTasks, workBatch) {
  for (let i = 0; i < workBatch.length; i++) {
    parallelTasks.push(context.df.callActivity("F2", workBatch[i]));
  }
  context.df.Task.all(parallelTasks);
}

function* fan_out_fan_in_2(context, parallelTasks) {
    const sum = parallelTasks.reduce((prev, curr) => prev + curr, 0);
    return context.df.callActivity("F3", sum);
  }
