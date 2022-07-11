use std::io::Write;

use rusty_v8 as v8;

static CODE: &'static str = "
function* my_workflow() {
    potato = 'rust is very ';
    yield potato;
    potato += 'strange';
    yield potato;
}
";

static ORCH_FUNC_NAME: &'static str = "my_workflow";

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
        let mut snapshot_creator = v8::SnapshotCreator::new(None);
        let mut isolate: v8::OwnedIsolate;
        unsafe {
            isolate = snapshot_creator.get_owned_isolate();
        }

        let f = std::fs::File::create("/tmp/dump.bin").expect("Unable to create file");
        let mut f = std::io::BufWriter::new(f);
        let cb = |arr: &[u8]| -> bool {
            // println!("hello");
            f.write_all(arr).expect("Unable to write data");
            return true;
        };

        // let isolate = &mut v8::Isolate::new(v8::CreateParams::default());

        {
            let handle_scope = &mut v8::HandleScope::new(&mut isolate);
            let context = v8::Context::new(handle_scope);
            let scope = &mut v8::ContextScope::new(handle_scope, context);
            let code = v8::String::new(scope, CODE).unwrap();
            let script = v8::Script::compile(scope, code, None).unwrap();
            let result = script.run(scope).unwrap();

            let orch_func_name = v8::String::new(scope, ORCH_FUNC_NAME).unwrap();
            let orch_func_val = context
                .global(scope)
                .get(scope, orch_func_name.into())
                .unwrap();
            let orch_func_obj = orch_func_val.to_object(scope).unwrap();

            if !orch_func_obj.is_generator_function() {
                panic!("workflow function is not a generator")
            }

            println!("{}", orch_func_obj.is_generator_function());

            let orch_func: v8::Local<v8::Function>;
            unsafe {
                orch_func = v8::Local::cast(orch_func_obj);
            }

            let generator_val = orch_func.call(scope, result, &[]).unwrap();
            let generator_obj = generator_val.to_object(scope).unwrap();
            let generator_obj_str = generator_val
                .to_string(scope)
                .unwrap()
                .to_rust_string_lossy(scope);
            println!("{}", generator_obj_str);

            let next_method_str = v8::String::new(scope, "next").unwrap();
            let next_method = generator_obj.get(scope, next_method_str.into()).unwrap();

            let next_func: v8::Local<v8::Function>;
            unsafe {
                next_func = v8::Local::cast(next_method);
            }

            let value_str = v8::String::new(scope, "value").unwrap();
            // let done_str = v8::String::new(scope, "done").unwrap();

            // first iteration
            let iteration = next_func.call(scope, generator_val, &[]).unwrap();

            let value = iteration
                .to_object(scope)
                .unwrap()
                .get(scope, value_str.into())
                .unwrap();
            let value_str = value.to_string(scope).unwrap().to_rust_string_lossy(scope);
            println!("Iteration result is: {}", value_str);

            // v8::SnapshotCreator::new(external_references);
        }

        snapshot_creator.create_blob(v8::FunctionCodeHandling::Clear);
        print!("snapshot created")

        // let f = std::fs::File::create("/tmp/snapshot.json").expect("Unable to create file");
        // let mut f = std::io::BufWriter::new(f);
        // let cb = |arr: &[u8]| -> bool {
        //     // println!("hello");
        //     f.write_all(arr).expect("Unable to write data");
        //     return true;
        // };
        // isolate.take_heap_snapshot(cb);
    }

    // {
    //     let mut f2 = std::fs::File::open("/tmp/snapshot.json").expect("file not found");
    //     let metadata = std::fs::metadata(&"/tmp/snapshot.json").expect("unable to read metadata");
    //     let mut buffer = vec![0; metadata.len() as usize];
    //     std::io::Read::read(&mut f2, &mut buffer).expect("buffer overflow");

    //     let new_isolate_params = v8::CreateParams::default();
    //     let snap_blob = new_isolate_params.snapshot_blob(buffer);
    //     let new_isolate = &mut v8::Isolate::new(snap_blob);
    // }

    unsafe {
        v8::V8::dispose();
    }
    // v8::V8::dispose_platform();
}
