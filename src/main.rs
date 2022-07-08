use rusty_v8 as v8;

static CODE: &'static str = "
function* my_workflow() {
    x = 0;
    yield x;
    x++;
    yield x;
}
";

// static CODE: &'static str = "
// function my_workflow() {
//   return 'hello world';
// }
// ";

fn main() {
    // Initialize V8.
    let platform = v8::new_default_platform(0, false).make_shared();
    v8::V8::initialize_platform(platform);
    v8::V8::initialize();

    {
        // Create a new Isolate and make it the current one.
        let isolate = &mut v8::Isolate::new(v8::CreateParams::default());

        // Create a stack-allocated handle scope.
        let handle_scope = &mut v8::HandleScope::new(isolate);

        // Create a new context.
        let context = v8::Context::new(handle_scope);

        // Enter the context for compiling and running the hello world script.
        let scope = &mut v8::ContextScope::new(handle_scope, context);

        // Create a string containing the JavaScript source code.
        let code = v8::String::new(scope, CODE).unwrap();

        // Compile the source code.
        let script = v8::Script::compile(scope, code, None).unwrap();
        // Run the script to get the result.
        let result = script.run(scope).unwrap();

        let x = v8::String::new(scope, "my_workflow").unwrap();
        let y = context.global(scope).get(scope, x.into()).unwrap();
        let func_obj = y.to_object(scope).unwrap();

        println!("{}", y.is_generator_function());

        let fun: v8::Local<v8::Function>;

        unsafe {
            fun = v8::Local::cast(func_obj);
        }

        let r = fun.call(scope, result, &[]).unwrap();
        let x = r.to_string(scope).unwrap().to_rust_string_lossy(scope);

        println!("{}", x);

        let gen_object = r.to_object(scope).unwrap();
        let next_method_str = v8::String::new(scope, "next").unwrap();
        let next_method = gen_object.get(scope, next_method_str.into()).unwrap();

        let next_func: v8::Local<v8::Function>;
        unsafe {
            next_func = v8::Local::cast(next_method);
        }

        let value_str = v8::String::new(scope, "value").unwrap();
        let done_str = v8::String::new(scope, "done").unwrap();

        loop {
            let iteration = next_func.call(scope, r, &[]).unwrap();

            let done = iteration.to_object(scope).unwrap().get(scope, done_str.into()).unwrap().to_boolean(scope).boolean_value(scope);
            if done {
                break;
            }

            let value = iteration.to_object(scope).unwrap().get(scope, value_str.into()).unwrap();
            let value_str = value.to_string(scope).unwrap().to_rust_string_lossy(scope);
            println!("Iteration result is: {}", value_str);
        }
    }

    unsafe {
        v8::V8::dispose();
    }
    // v8::V8::dispose_platform();
}
