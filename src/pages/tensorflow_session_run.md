---
title: tensorflow sess.run()是如何实现的
draft: true
---

先考虑最简单的情况。我们就一层一层往里看。

```python
import tensorflow as tf

a = tf.constant(1)
b = tf.constant(2)
add = a + b
sess = tf.Session()
with sess.as_default():
    print(sess.run(add))
```

step in `sess.run`进去是

```python
  def run(self, fetches, feed_dict=None, options=None, run_metadata=None):
    options_ptr = tf_session.TF_NewBufferFromString(
        compat.as_bytes(options.SerializeToString())) if options else None
    run_metadata_ptr = tf_session.TF_NewBuffer() if run_metadata else None

    try:
      result = self._run(None, fetches, feed_dict, options_ptr,
                         run_metadata_ptr)
      if run_metadata:
        proto_data = tf_session.TF_GetBuffer(run_metadata_ptr)
        run_metadata.ParseFromString(compat.as_bytes(proto_data))
    finally:
      if run_metadata_ptr:
        tf_session.TF_DeleteBuffer(run_metadata_ptr)
      if options:
        tf_session.TF_DeleteBuffer(options_ptr)
    return result
```

然后step in `self._run`

```python
  def _run(self, handle, fetches, feed_dict, options, run_metadata):
    """Perform either run or partial_run, depending the presence of `handle`."""

    def _feed_fn(feed, feed_val):
      for tensor_type, _, feed_fn, _ in _REGISTERED_EXPANSIONS:
        if isinstance(feed, tensor_type):
          return feed_fn(feed, feed_val)
      raise TypeError('Feed argument %r has invalid type %r' % (feed,
                                                                type(feed)))

    # Check session.
    if self._closed:
      raise RuntimeError('Attempted to use a closed Session.')
    if self.graph.version == 0:
      raise RuntimeError('The Session graph is empty.  Add operations to the '
                         'graph before calling run().')

    # Create request.
    feed_dict_tensor = {}
    feed_map = {}

    # Validate and process feed_dict.
    feed_handles = {}
    if feed_dict:
        ...

    # Create a fetch handler to take care of the structure of fetches.
    fetch_handler = _FetchHandler(
        self._graph, fetches, feed_dict_tensor, feed_handles=feed_handles)

    # Run request and get response.
    # We need to keep the returned movers alive for the following _do_run().
    # These movers are no longer needed when _do_run() completes, and
    # are deleted when `movers` goes out of scope when this _run() ends.
    # TODO(yuanbyu, keveman): Revisit whether we should just treat feeding
    # of a handle from a different device as an error.
    _ = self._update_with_movers(feed_dict_tensor, feed_map)
    final_fetches = fetch_handler.fetches()
    final_targets = fetch_handler.targets()
    # We only want to really perform the run if fetches or targets are provided,
    # or if the call is a partial run that specifies feeds.
    if final_fetches or final_targets or (handle and feed_dict_tensor):
      results = self._do_run(handle, final_targets, final_fetches,
                             feed_dict_tensor, options, run_metadata)
    else:
      results = []
    return fetch_handler.build_results(self, results)
```

然后step in `self._do_run`

```python
  def _do_run(self, handle, target_list, fetch_list, feed_dict, options,
              run_metadata):
    """Runs a step based on the given fetches and feeds.

    Args:
      handle: a handle for partial_run. None if this is just a call to run().
      target_list: A list of operations to be run, but not fetched.
      fetch_list: A list of tensors to be fetched.
      feed_dict: A dictionary that maps tensors to numpy ndarrays.
      options: A (pointer to a) [`RunOptions`] protocol buffer, or None
      run_metadata: A (pointer to a) [`RunMetadata`] protocol buffer, or None

    Returns:
      A list of numpy ndarrays, corresponding to the elements of
      `fetch_list`.  If the ith element of `fetch_list` contains the
      name of an operation, the first Tensor output of that operation
      will be returned for that element.

    Raises:
      tf.errors.OpError: Or one of its subclasses on error.
    """
    # pylint: disable=protected-access
    feeds = dict((t._as_tf_output(), v) for t, v in feed_dict.items())
    fetches = [t._as_tf_output() for t in fetch_list]
    targets = [op._c_op for op in target_list]
    # pylint: enable=protected-access

    def _run_fn(feed_dict, fetch_list, target_list, options, run_metadata):
      # Ensure any changes to the graph are reflected in the runtime.
      self._extend_graph()
      return self._call_tf_sessionrun(
          options, feed_dict, fetch_list, target_list, run_metadata)

    def _prun_fn(handle, feed_dict, fetch_list):
      if target_list:
        raise RuntimeError('partial_run() requires empty target_list.')
      return self._call_tf_sessionprun(handle, feed_dict, fetch_list)

    if handle is None:
      return self._do_call(_run_fn, feeds, fetches, targets, options,
                           run_metadata)
    else:
      return self._do_call(_prun_fn, handle, feeds, fetches)
```

然后进到`self._do_call`

```python
    def _do_call(self, fn, *args):
    try:
      return fn(*args)
    except errors.OpError as e:
      message = compat.as_text(e.message)
      m = BaseSession._NODEDEF_NAME_RE.search(message)
      node_def = None
      op = None
      if m is not None:
        node_name = m.group(3)
        try:
          op = self._graph.get_operation_by_name(node_name)
          node_def = op.node_def
        except KeyError:
          pass
      message = error_interpolation.interpolate(message, self._graph)
      raise type(e)(node_def, op, message)
```

进`fn(*args)`，回到`_run_fn`

```python
    def _run_fn(feed_dict, fetch_list, target_list, options, run_metadata):
      # Ensure any changes to the graph are reflected in the runtime.
      self._extend_graph()
      return self._call_tf_sessionrun(
          options, feed_dict, fetch_list, target_list, run_metadata)
```

先看`self_extend_graph`

```python
  def _extend_graph(self):
    with self._graph._session_run_lock():  # pylint: disable=protected-access
      tf_session.ExtendSession(self._session)
```

这里的`self._graph = ops.get_default_graph()`，然后`ops`为`from tensorflow.python.framework import ops`。

首先看这个锁，也就是`self._graph._session_run_lock()`

```python
  def _session_run_lock(self):
    """Returns a lock to guard code for Session.run.

    See the comment for self._group_lock for more info.
    """
    # _SESSION_RUN_LOCK_GROUP = 1
    return self._group_lock.group(_SESSION_RUN_LOCK_GROUP)
```

这里有

```python
    # The group lock synchronizes Session.run calls with methods that create
    # and mutate ops (e.g. Graph.create_op()). This synchronization is
    # necessary because it's illegal to modify an operation after it's been run.
    # The group lock allows any number of threads to mutate ops at the same time
    # but if any modification is going on, all Session.run calls have to wait.
    # Similarly, if one or more Session.run calls are going on, all mutate ops
    # have to wait until all Session.run calls have finished.
    
    # _MUTATION_LOCK_GROUP = 0
	# _SESSION_RUN_LOCK_GROUP = 1
    self._group_lock = lock_util.GroupLock(num_groups=2)
```

这里的`GroupLock`的实现是利用了python的`threading.Condition(threading.Lock())`做的一个带计数的锁，让operation mutation和session run分开进行。

加上锁之后，回来看`tf_session.ExtendSession(self._session)`，在`python\pywrap_tensorflow_internal.py`中。

```python
def ExtendSession(session):
    return _pywrap_tensorflow_internal.ExtendSession(session)
ExtendSession = _pywrap_tensorflow_internal.ExtendSession
```

tensorflow使用SWIG作为连接python和c++的桥梁。

这个怎么连的等之后再说，先看C++部分的代码：

```cpp
// core/distributed_runtime/master.cc
void Master::ExtendSession(const ExtendSessionRequest* req,
                           ExtendSessionResponse* resp, MyClosure done) {
  auto session = FindMasterSession(req->session_handle());
  if (session == nullptr) {
    done(errors::Aborted("Session ", req->session_handle(), " is not found."));
    return;
  }

  SchedClosure([session, req, resp, done]() {
    Status status = ValidateExternalGraphDefSyntax(req->graph_def());
    if (status.ok()) {
      status = session->Extend(req, resp);
    }
    session->Unref();
    done(status);
  });
}
```

先来看`FindMasterSession`，其主要内容就是找到对应的`MasterSession`，并返回其指针。

```cpp
// core/distributed_runtime/master.cc
MasterSession* Master::FindMasterSession(const string& handle) {
  MasterSession* session = nullptr;
  {
    mutex_lock l(mu_);
    session = gtl::FindPtrOrNull(sessions_, handle);  // 下面有定义，就是根据key找value
    if (session != nullptr) {
      session->Ref();
    }
  }
  return session;
}

// core/lib/gtl/map_util.h

// Returns the pointer value associated with the given key. If none is found,
// NULL is returned. The function is designed to be used with a map of keys to
// pointers.
//
// This function does not distinguish between a missing key and a key mapped
// to a NULL value.
template <class Collection>
typename Collection::value_type::second_type FindPtrOrNull(
    const Collection& collection,
    const typename Collection::value_type::first_type& key) {
  typename Collection::const_iterator it = collection.find(key);
  if (it == collection.end()) {
    return typename Collection::value_type::second_type();
  }
  return it->second;
}

// core/distributed_runtime/master_session.h

// A session encapsulates a graph computation (resource allocation,
// placement, execution, etc.).
class MasterSession : public core::RefCounted {
 public:
  // This session encapsulates the graph computation for a graph.
  //
  // The session places nodes on devices in "remote_devs" and executes
  // operations on these devices.
  //
  // The caller takes ownership of all remote devices.
  ...
};

// core/lib/core/refcount.h
class RefCounted {
 public:
  // Initial reference count is one.
  RefCounted();

  // Increments reference count by one.
  void Ref() const;
};
```

然后是`SchedClosure`，在`core/common_runtime/process_util.cc`

```cpp
void SchedClosure(std::function<void()> closure) {
  if (!tracing::EventCollector::IsEnabled()) {
    return Env::Default()->SchedClosure(std::move(closure));
  }
  uint64 id = tracing::GetUniqueArg();
  tracing::RecordEvent(tracing::EventCategory::kScheduleClosure, id);

  Env::Default()->SchedClosure([id, closure = std::move(closure)]() {
    tracing::ScopedRegion region(tracing::EventCategory::kRunClosure, id);
    closure();
  });
}

/// \brief 一个用来access operating system 功能，如filesystem等的接口.
///
/// Callers may wish to provide a custom Env object to get fine grain
/// control.
///
/// All Env implementations are safe for concurrent access from
/// multiple threads without any external synchronization.
class Env {
 public:
  Env();
  virtual ~Env() = default;

  /// \brief Returns a default environment suitable for the current operating
  /// system.
  ///
  /// Sophisticated users may wish to provide their own Env
  /// implementation instead of relying on this default environment.
  ///
  /// The result of Default() belongs to this library and must never be deleted.
  static Env* Default();
  ...
  // \brief Schedules the given closure on a thread-pool.
  //
  // NOTE(mrry): This closure may block.
  virtual void SchedClosure(std::function<void()> closure) = 0;
  ...
};
```

大概就是会schedule这个函数在一个thread上。所以我们只需要关注`SchedClosure`里面的函数，也就是

```cpp
  [session, req, resp, done]() {
    // 判断graph是不是符合要求
    Status status = ValidateExternalGraphDefSyntax(req->graph_def());
    if (status.ok()) {
      status = session->Extend(req, resp);
    }
    session->Unref();
    done(status);
  }
```

重点就是`session->Extend`

```cpp
// core/distributed_runtime/master_session.cc

  // Attempt to extend the graph according to the given "req".
  // (See master.proto for details of valid extensions.)
  //
  // PRECONDITION: The current version of this session's graph
  //   is "req->current_graph_version".
  //
  // POSTCONDITION: The current version of this session's graph
  //   is "resp->new_graph_version".
  //
  // Extend() may block the caller thread for a long time.
Status MasterSession::Extend(const ExtendSessionRequest* req,
                             ExtendSessionResponse* resp) {
  UpdateLastAccessTime();
  std::unique_ptr<GraphExecutionState> extended_execution_state;
  {
    mutex_lock l(mu_);
    if (closed_) {
      return errors::FailedPrecondition("Session is closed.");
    }

    if (graph_version_ != req->current_graph_version()) {
      return errors::Aborted("Current version is ", graph_version_,
                             " but caller expected ",
                             req->current_graph_version(), ".");
    }

    CHECK(execution_state_);
    TF_RETURN_IF_ERROR(
        execution_state_->Extend(req->graph_def(), &extended_execution_state));

    CHECK(extended_execution_state);
    // The old execution state will be released outside the lock.
    execution_state_.swap(extended_execution_state);
    ++graph_version_;
    resp->set_new_graph_version(graph_version_);
  }
  return Status::OK();
}
```

下面是最核心的`Extend`函数，可以理解成从创建的图转化为实际的计算图的代码

```cpp
// core/common_runtime/graph_execution_state.h

// GraphExecutionState is responsible for generating an
// executable ClientGraph from the original GraphDef that specifies
// the complete graph and from BuildGraphOptions which specifies
// input/output nodes.
//
// An executable Graph differs from a GraphDef by being Placed,
// meaning that each Node is assigned to a single Device in the
// available set.
//
// When GraphExecutionState is first constructed it instantiates
// a full Graph from the provided GraphDef, and places it, using only
// the static device assignments from the GraphDef.  Nodes without are
// currently placed in a very naive way.  Since stateful Nodes cannot
// be moved after initial placement, it is important that stateful
// Nodes get sensible initial device assignments in the graph
// definition.
//
// Subsequently, GraphExecutionState generates a SimpleClientGraph on
// demand, which is a sub-graph of the latest placement of the full
// Graph.  MasterSession uses such a ClientGraph to execute one or
// more similar client requests.
//
// GraphExecutionState is thread-safe.

class GraphExecutionState {
  ...
  // Creates a new GraphExecutionState representing the
  // concatenation of this graph, and the graph defined by
  // "extension_def". The same name may not be used to define a node
  // in both this graph and "extension_def".
  //
  // If successful, returns OK and the caller takes ownership of "*out".
  // Otherwise returns an error and does not modify "*out".
  //
  // After calling `old_state->Extend()`, `old_state` may no longer be
  // used.
  //
  // NOTE(mrry): This method respects the placement of stateful nodes in
  // in *this, but currently does not transfer any other placement
  // or cost model information to the new graph.
  Status Extend(const GraphDef& extension_def,
                std::unique_ptr<GraphExecutionState>* out) const;
  ...
};

// core/common_runtime/graph_execution_state.cc

Status GraphExecutionState::Extend(
    const GraphDef& extension_def,
    std::unique_ptr<GraphExecutionState>* out) const {
  GraphDef gdef;

  // 1. Copy the function library.
  TF_RETURN_IF_ERROR(flib_def_->AddLibrary(extension_def.library()));
  *gdef.mutable_library() = flib_def_->ToProto();

  // 2. Build an index of the new node names.
  std::unordered_set<string> new_names;
  for (const NodeDef& node : extension_def.node()) {
    new_names.insert(node.name());
  }

  // 3. Add the non-duplicates from the old graph to the new graph.
  //    Return an error if the same node name appears in both the
  //    old graph and the extension.
  for (const NodeDef& node : original_graph_def_.node()) {
    if (new_names.count(node.name()) == 0) {
      *gdef.add_node() = node;
    } else {
      return errors::InvalidArgument(tensorflow::strings::Printf(
          "GraphDef argument to Extend includes node '%s', which was created "
          "by a previous call to Create or Extend in this session.",
          node.name().c_str()));
    }
  }

  // 4. Merge the versions field.
  int old_node_size = gdef.node_size();
  gdef.mutable_node()->MergeFrom(extension_def.node());
  TF_RETURN_IF_ERROR(
      AddDefaultAttrsToGraphDef(&gdef, *flib_def_, old_node_size));
  // Merge versions
  if (gdef.has_versions()) {
    if (gdef.versions().producer() != extension_def.versions().producer()) {
      return errors::InvalidArgument(
          "Can't extend GraphDef at version ", gdef.versions().producer(),
          " with graph at version ", extension_def.versions().producer());
    }
    VersionDef* versions = gdef.mutable_versions();
    versions->set_min_consumer(std::max(
        versions->min_consumer(), extension_def.versions().min_consumer()));
    if (extension_def.versions().bad_consumers_size()) {
      // Add new bad_consumers that aren't already marked bad.
      //
      // Note: This implementation is quadratic time if there are many calls to
      // ExtendLocked with many bad consumers.  Since this is unlikely, and
      // fixing it would require data structures outside of this routine,
      // quadratic time it is.
      auto* bad_consumers = versions->mutable_bad_consumers();
      const std::unordered_set<int> existing(bad_consumers->begin(),
                                             bad_consumers->end());
      for (const int v : extension_def.versions().bad_consumers()) {
        if (existing.find(v) == existing.end()) {
          bad_consumers->Add(v);
        }
      }
    }

  } else {
    gdef.mutable_versions()->CopyFrom(extension_def.versions());
  }

  // 5. Validate that the final graphdef is valid.
  if (gdef.versions().producer() >= 5) {
    // Validate the graph: we assume that merging two valid graphs
    // should maintain graph validity.
    TF_RETURN_IF_ERROR(graph::ValidateGraphDef(gdef, *flib_def_));
  }

  // 6. Add the extension.
  GraphExecutionStateOptions combined_options;
  combined_options.device_set = device_set_;
  combined_options.session_options = session_options_;
  combined_options.session_handle = session_handle_;
  combined_options.stateful_placements = stateful_placements_;

  // NOTE(mrry): `gdef` is no longer valid after the constructor
  // executes.
  std::unique_ptr<GraphExecutionState> new_execution_state(
      new GraphExecutionState(&gdef, combined_options));

  TF_RETURN_IF_ERROR(AddDefaultAttrsToGraphDef(
      &new_execution_state->original_graph_def_, *flib_def_, 0));
  if (!session_options_->config.graph_options().place_pruned_graph()) {
    // TODO(mrry): Refactor InitBaseGraph() so that we don't have to
    // pass an empty BuildGraphOptions (that isn't going to be used
    // when place_pruned_graph is false).
    TF_RETURN_IF_ERROR(new_execution_state->InitBaseGraph(BuildGraphOptions()));
  }
  *out = std::move(new_execution_state);

  // TODO(mrry): This is likely to be used for non-throughput-sensitive
  // interactive workloads, but in future we may want to transfer other
  // parts of the placement and/or cost model.
  return Status::OK();
}
```

大致就是复制了一下计算图。做完这件事就返回python了（运行完了python的`_extend_graph`）。然后就是运行`self._call_tf_sessionrun`

```python
  def _call_tf_sessionrun(self, options, feed_dict, fetch_list, target_list,
                          run_metadata):
    return tf_session.TF_SessionRun_wrapper(
        self._session, options, feed_dict, fetch_list, target_list,
        run_metadata)

# pywrap_tensorflow_internal.py
def TF_SessionRun_wrapper(session, run_options, inputs, outputs, targets, run_metadata):
    return _pywrap_tensorflow_internal.TF_SessionRun_wrapper(session, run_options, inputs, outputs, targets, run_metadata)
TF_SessionRun_wrapper = _pywrap_tensorflow_internal.TF_SessionRun_wrapper
```

之后我们就又回到了C++的部分。

这个的定义在`python/client/tf_session_helper.h`

```cpp
// python/client/tf_session_helper.cc

// Runs the graph associated with the session starting with the supplied inputs.
// On success, `py_outputs` is populated with a numpy ndarray for each output
// (the caller must decref these ndarrays, although this will likely be handled
// by the Python gc). `session`, `out_status`, and `py_outputs` must be
// non-null. `py_outputs` should be empty.
void TF_SessionRun_wrapper(TF_Session* session, const TF_Buffer* run_options,
                           const std::vector<TF_Output>& inputs,
                           const std::vector<PyObject*>& input_ndarrays,
                           const std::vector<TF_Output>& outputs,
                           const std::vector<TF_Operation*>& targets,
                           TF_Buffer* run_metadata, TF_Status* out_status,
                           std::vector<PyObject*>* py_outputs) {
  TF_SessionRun_wrapper_helper(session, nullptr, run_options, inputs,
                               input_ndarrays, outputs, targets, run_metadata,
                               out_status, py_outputs);
  // Release any unused ndarray references (see memory management comment in
  // TF_SessionRun_wrapper_helper)
  ClearDecrefCache();
}

void TF_SessionRun_wrapper_helper(TF_Session* session, const char* handle,
                                  const TF_Buffer* run_options,
                                  const std::vector<TF_Output>& inputs,
                                  const std::vector<PyObject*>& input_ndarrays,
                                  const std::vector<TF_Output>& outputs,
                                  const std::vector<TF_Operation*>& targets,
                                  TF_Buffer* run_metadata,
                                  TF_Status* out_status,
                                  std::vector<PyObject*>* py_outputs) {
  DCHECK_EQ(inputs.size(), input_ndarrays.size());
  DCHECK(py_outputs != nullptr);
  DCHECK(py_outputs->empty());
  Status s;

  // Convert input ndarray PyObjects to TF_Tensors. We maintain a continuous
  // array of TF_Tensor*s as well as scoped containers to make sure they're
  // cleaned up properly.
  //
  // Memory management:
  // PyArrayToTF_Tensor() creates a new ndarray PyObject from the input
  // ndarray. We manage the new ndarray's lifetime in order to keep the
  // underlying data buffer alive (the new ndarray also guarantees a contiguous
  // data buffer). The new ndarray's data buffer is used to create the
  // corresponding TF_Tensor. The TF_Tensor's deallocator will queue the new
  // ndarray to be decref'd by the next ClearDecrefCache() call (we can't call
  // Py_DECREF in the deallocator directly because the GIL must be held).
  //
  // Note that TF_Tensor may directly delegate its data and deallocator to a
  // TensorBuffer, which may outlive the TF_Tensor (e.g. if the tensor gets
  // queued or assigned to a variable).
  TF_TensorVector input_vals;
  std::vector<Safe_TF_TensorPtr> input_vals_safe;
  for (PyObject* ndarray : input_ndarrays) {
    input_vals_safe.emplace_back(make_safe(static_cast<TF_Tensor*>(nullptr)));
    s = PyArrayToTF_Tensor(ndarray, &input_vals_safe.back());
    if (!s.ok()) {
      Set_TF_Status_from_Status(out_status, s);
      return;
    }
    input_vals.push_back(input_vals_safe.back().get());
  }

  // Allocate space for output TF_Tensor*s
  TF_TensorVector output_vals(outputs.size());

  // Clear up any unused memory leftover from previous runs
  ClearDecrefCache();

  // Call TF_SessionRun() (and release GIL during execution)
  Py_BEGIN_ALLOW_THREADS;
  if (handle == nullptr) {
    TF_SessionRun(session, run_options, inputs.data(), input_vals.data(),
                  inputs.size(), outputs.data(), output_vals.data(),
                  outputs.size(), targets.data(), targets.size(), run_metadata,
                  out_status);
  } else {
    TF_SessionPRun(session, handle, inputs.data(), input_vals.data(),
                   inputs.size(), outputs.data(), output_vals.data(),
                   outputs.size(), targets.data(), targets.size(), out_status);
  }
  Py_END_ALLOW_THREADS;

  // Create scoped containers for output tensors
  std::vector<Safe_TF_TensorPtr> output_vals_safe;
  for (TF_Tensor* output : output_vals) {
    output_vals_safe.emplace_back(make_safe(output));
  }

  // Convert outputs to ndarrays (in scoped containers)
  std::vector<Safe_PyObjectPtr> py_outputs_safe;
  for (size_t i = 0; i < outputs.size(); ++i) {
    PyObject* py_array;
    s = TF_TensorToPyArray(std::move(output_vals_safe[i]), &py_array);
    if (!s.ok()) {
      Set_TF_Status_from_Status(out_status, s);
      return;
    }
    py_outputs_safe.emplace_back(make_safe(py_array));
  }

  // If we reach this point, we have successfully built a list of objects so we
  // can release them from the safe container into the return vector.
  for (size_t i = 0; i < outputs.size(); ++i) {
    py_outputs->push_back(py_outputs_safe[i].release());
  }
}
```

这个函数上下都是转换类型，重点是中间的`TF_SessionRun`

```cpp
// c/c_api.cc
void TF_SessionRun(TF_Session* session, const TF_Buffer* run_options,
                   const TF_Output* inputs, TF_Tensor* const* input_values,
                   int ninputs, const TF_Output* outputs,
                   TF_Tensor** output_values, int noutputs,
                   const TF_Operation* const* target_opers, int ntargets,
                   TF_Buffer* run_metadata, TF_Status* status) {
  // TODO(josh11b,mrry): Change Session to be able to use a Graph*
  // directly, instead of requiring us to serialize to a GraphDef and
  // call Session::Extend().
  if (session->extend_before_run &&
      !ExtendSessionGraphHelper(session, status)) {
    return;
  }

  TF_Run_Setup(noutputs, output_values, status);

  // Convert from TF_Output and TF_Tensor to a string and Tensor.
  std::vector<std::pair<string, Tensor>> input_pairs(ninputs);
  if (!TF_Run_Inputs(input_values, &input_pairs, status)) return;
  for (int i = 0; i < ninputs; ++i) {
    input_pairs[i].first = OutputName(inputs[i]);
  }

  // Convert from TF_Output to string names.
  std::vector<string> output_names(noutputs);
  for (int i = 0; i < noutputs; ++i) {
    output_names[i] = OutputName(outputs[i]);
  }

  // Convert from TF_Operation* to string names.
  std::vector<string> target_names(ntargets);
  for (int i = 0; i < ntargets; ++i) {
    target_names[i] = target_opers[i]->node.name();
  }

  // Actually run.
  TF_Run_Helper(session->session, nullptr, run_options, input_pairs,
                output_names, output_values, target_names, run_metadata,
                status);
}

static void TF_Run_Helper(
    Session* session, const char* handle, const TF_Buffer* run_options,
    // Input tensors
    const std::vector<std::pair<string, Tensor>>& input_pairs,
    // Output tensors
    const std::vector<string>& output_tensor_names, TF_Tensor** c_outputs,
    // Target nodes
    const std::vector<string>& target_oper_names, TF_Buffer* run_metadata,
    TF_Status* status) {
  const int noutputs = output_tensor_names.size();
  std::vector<Tensor> outputs(noutputs);
  Status result;

  if (handle == nullptr) {
    RunOptions run_options_proto;
    if (run_options != nullptr && !run_options_proto.ParseFromArray(
                                      run_options->data, run_options->length)) {
      status->status = InvalidArgument("Unparseable RunOptions proto");
      return;
    }
    if (run_metadata != nullptr && run_metadata->data != nullptr) {
      status->status =
          InvalidArgument("Passing non-empty run_metadata is invalid.");
      return;
    }

    RunMetadata run_metadata_proto;
    result = session->Run(run_options_proto, input_pairs, output_tensor_names,
                          target_oper_names, &outputs, &run_metadata_proto);

    // Serialize back to upstream client, who now owns the new buffer
    if (run_metadata != nullptr) {
      status->status = MessageToBuffer(run_metadata_proto, run_metadata);
      if (TF_GetCode(status) != TF_OK) return;
    }
  } else {
    // NOTE(zongheng): PRun does not support RunOptions yet.
    result = session->PRun(handle, input_pairs, output_tensor_names, &outputs);
  }
  if (!result.ok()) {
    status->status = result;
    return;
  }

  // Store results in c_outputs[]
  for (int i = 0; i < noutputs; ++i) {
    const Tensor& src = outputs[i];
    if (!src.IsInitialized() || src.NumElements() == 0) {
      c_outputs[i] =
          EmptyTensor(static_cast<TF_DataType>(src.dtype()), src.shape());
      continue;
    }
    c_outputs[i] = TF_TensorFromTensor(src, status);
    if (TF_GetCode(status) != TF_OK) return;
  }
}
```

然后具体还是`session->Run`，对应的是`ClientSession::Run`

```cpp
// cc/client/client_session.h

/// A `ClientSession` object lets the caller drive the evaluation of the
/// TensorFlow graph constructed with the C++ API.
///
/// Example:
///
///     Scope root = Scope::NewRootScope();
///     auto a = Placeholder(root, DT_INT32);
///     auto c = Add(root, a, {41});
///
///     ClientSession session(root);
///     std::vector<Tensor> outputs;
///
///     Status s = session.Run({ {a, {1}} }, {c}, &outputs);
///     if (!s.ok()) { ... }
class ClientSession {
 public:
  ...
  /// Evaluate the tensors in `fetch_outputs`. The values are returned as
  /// `Tensor` objects in `outputs`. The number and order of `outputs` will
  /// match `fetch_outputs`.
  Status Run(const std::vector<Output>& fetch_outputs,
             std::vector<Tensor>* outputs) const;

  /// Use `run_options` to turn on performance profiling. `run_metadata`, if not
  /// null, is filled in with the profiling results.
  Status Run(const RunOptions& run_options, const FeedType& inputs,
             const std::vector<Output>& fetch_outputs,
             const std::vector<Operation>& run_outputs,
             std::vector<Tensor>* outputs, RunMetadata* run_metadata) const;
};

// cc/client/client_session.cc
Status ClientSession::Run(const RunOptions& run_options, const FeedType& inputs,
                          const std::vector<Output>& fetch_outputs,
                          const std::vector<Operation>& run_outputs,
                          std::vector<Tensor>* outputs,
                          RunMetadata* run_metadata) const {
  std::vector<std::pair<string, Tensor>> feeds;
  for (auto const& feed : inputs) {
    TF_RETURN_IF_ERROR(feed.second.status);
    feeds.emplace_back(feed.first.name(), feed.second.tensor);
  }
  std::vector<string> output_tensor_names;
  output_tensor_names.reserve(fetch_outputs.size());
  for (auto const& output : fetch_outputs) {
    output_tensor_names.push_back(output.name());
  }
  std::vector<string> target_node_names;
  target_node_names.reserve(run_outputs.size());
  for (auto const& output : run_outputs) {
    target_node_names.push_back(output.node()->name());
  }
  TF_RETURN_IF_ERROR(impl()->MaybeExtendGraph());
  return impl()->session_->Run(run_options, feeds, output_tensor_names,
                               target_node_names, outputs, run_metadata);
}
```

