function* choice(context) {
    const fate = yield context.df.callActivity("try_luck");

    if (fate) {
        context.log('lucky!');
        const outcome = yield context.df.callActivity("sleep", 1);
    } else {
        context.log('too bad...');
        const outcome = yield context.df.callActivity("sleep", 10);
    }

    return outcome;
}