import {useState, useEffect} from 'react'
import { Button, Modal, Form, Message } from 'semantic-ui-react'
//import useLocalStorage from "use-local-storage";
import {CopyButton} from './Common.jsx';
import {MarmaladeNGBridgeClient} from "marmalade-ng-bridge";
import {INSTANCES, DEFAULT_INSTANCE} from './OnChainRefs.js'
import useLocalStorage from "use-local-storage";


function SettingsModal({trigger})
{
  const [open, setOpen] = useState(false);
  const [data, _setData] = useState({});
  const [pactError, setPactError] = useState(false)
  const [bridgeRef, setBridgeRef] = useLocalStorage("brige_instance", DEFAULT_INSTANCE);

  const setData = x => {setPactError(false);
                        _setData({...data, ...x});}

  const setInstance = x => {if (x!="Custom")
                              setData(INSTANCES[x]);
                            else
                              setData({name:"Custom"})

                            }

  const validate = () => {if(data.name && data.node && data.network && data.interface_ns && data.bridge_ns)
                            setBridgeRef(data)
                          else
                            setPactError(true);
                          setOpen(false);
                          }



  const selectOptions = Object.keys(INSTANCES).map((x)=> ({text:x, value:x}))
  selectOptions.push({text:"Custom", value:"Custom"})

  return  <Modal size="tiny" onClose={() => setOpen(false)} onOpen={() => {setOpen(true);_setData(bridgeRef)}} open={open} trigger={trigger}>
            <Modal.Header>Frontend settings</Modal.Header>
            <Modal.Content>
              <Form >
                <Form.Select value={data.name} fluid label='Instance' options={selectOptions}
                             onChange={(_, e) => {setInstance(e.value)}}/>

                <Form.Field>
                  <label>Node URL</label>
                  <input value={data.node} onChange ={e => setData({node:e.target.value})} disabled={data.name!="Custom"} />
                </Form.Field>

                <Form.Group widths='equal'>
                  <Form.Field>
                    <label>Network</label>
                    <input value={data.network} onChange ={e => setData({network:e.target.value})} disabled={data.name!="Custom"} />
                  </Form.Field>


                </Form.Group>

                <Form.Field>
                  <label>Inteface Namespace <CopyButton value={data.ns} fontsize={10}/></label>

                  <input value={data.interface_ns} onChange ={e => setData({ns:e.target.value})} disabled={data.name!="Custom"} />

                </Form.Field>



                <Form.Field>
                  <label>Bridge_Namespace <CopyButton value={data.bridge_ns} fontsize={10}/></label>
                  <input value={data.bridge_ns} onChange ={e => setData({bridge_ns:e.target.value})} disabled={data.name!="Custom"} />
                </Form.Field>

              </Form>

            {pactError && <Message error header='Marmalade NG Error' content='Invalid settings' />}
            </Modal.Content>

            <Modal.Actions>
              <Button content="Cancel" color='black' onClick={() => setOpen(false)} />
              <Button content="OK" labelPosition='right' icon='checkmark' onClick={validate} positive />
            </Modal.Actions>
          </ Modal>
}

export {SettingsModal}
