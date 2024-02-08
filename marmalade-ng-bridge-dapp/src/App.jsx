import {useCallback, useReducer, useState, useEffect, useMemo} from 'react'
import {version} from './version.js';
import MARM_LOGO from './assets/marm_logo_shaded.png'

import 'fomantic-ui-css/semantic.min.css'
import {Container, Divider, Grid, Dropdown, Form, Input, Image, Menu, Icon, Segment, TabPane, Tab} from 'semantic-ui-react'
import {WalletAccountManager} from "./WalletManager.jsx";
import {BridgeForm} from "./BridgeForm.jsx";
import {FinishForm} from "./FinishForm.jsx";
import {MarmaladeNGBridgeClient} from "marmalade-ng-bridge";
import {SettingsModal} from "./SettingsModal";

import {DEFAULT_INSTANCE} from "./OnChainRefs"
import useLocalStorage from "use-local-storage";

function ExplorerMenu({bridge})
{
  return <Menu fixed='top' inverted style={{background:"rgb(30, 50, 61)"}}>
      <Menu.Item header>
        <Image size='mini' src={MARM_LOGO} style={{ marginRight: '1.5em' }} />
        Marmalade-NG Bridge
      </Menu.Item>
      <SettingsModal trigger={<Menu.Item as="a"> <Icon name="settings"/> </Menu.Item> }/>

    <Menu.Item position="right">
      {`v${version}`} / {bridge.network} / {bridge.bridge_mod}
    </Menu.Item>

  </Menu>

}

function App ()
{
  const [account, setAccount] = useState("")
  const [wallet, setWallet] = useState("")
  const [stored_ref] = useLocalStorage("brige_instance", DEFAULT_INSTANCE);

  const bridge = useMemo(() => new MarmaladeNGBridgeClient(stored_ref.node, stored_ref.network, stored_ref.interface_ns, stored_ref.bridge_ns),
                               [stored_ref])

  const panes = [
    { menuItem: 'Bridge',         render: () => <TabPane><BridgeForm bridge={bridge} account={account} wallet={wallet}/></TabPane> },
    { menuItem: 'Finish X-Chain', render: () => <TabPane><FinishForm bridge={bridge} account={account} wallet={wallet}/></TabPane> }]


  return <div>
    <ExplorerMenu bridge={bridge}/>

    <Container style={{paddingTop:"100px", paddingBottom:"30px"}}>
      <Form>
          <Grid centered>
            <Grid.Column width={8}>
            <Segment compact>
              <WalletAccountManager network={bridge.network} onWallet={setWallet} onAccount={setAccount}/>
            </Segment>
          </Grid.Column>
          </Grid>
          <Tab menu={{ color:"blue", attached: true, tabular: true }} panes={panes} />
      </Form>
    </Container>

  </div>
}

export default App
