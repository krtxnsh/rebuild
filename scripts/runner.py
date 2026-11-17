"""runner.py - run long Blender jobs on a timer so MCP calls return immediately; poll with status()."""
import bpy, traceback, time

def submit(fn, key='job'):
    ns = bpy.app.driver_namespace
    ns[key] = {'status': 'queued', 't0': time.time()}
    def _t():
        st = ns[key]
        try:
            st['status'] = 'running'
            r = fn()
            st.update(status='done', result=r, t=round(time.time() - st['t0'], 1))
        except Exception:
            st.update(status='error', error=traceback.format_exc()[-3000:])
        return None
    bpy.app.timers.register(_t, first_interval=0.05)
    return key

def status(key='job'):
    st = bpy.app.driver_namespace.get(key)
    if not st:
        return {'status': 'none'}
    d = dict(st)
    d.pop('t0', None)
    return d