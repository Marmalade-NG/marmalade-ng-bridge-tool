import {Header, Icon, Popup} from 'semantic-ui-react'
//import {Link} from 'react-router-dom';
import {useCallback} from 'react';

const EXPLORER = "https://explorer.chainweb.com/testnet"

const tx_detail = x => `${EXPLORER}/txdetail/${x}`

export function CopyButton({value, fontsize=16})
{
  const to_copy = useCallback(() => navigator.clipboard.writeText(value.toString()), [value])
  return  <Popup content="Copied" on='click' hideOnScroll
                 trigger={<Icon bordered link circular name='copy outline' onClick={to_copy} style={{fontSize:fontsize}} />} />
}

function CopyHeader({children, ...other})
{
  return  <Header {...other}>{children}
          &nbsp;<CopyButton value={children} />
          </Header>
}

/*
const CopyLink = ({val, onClick}) => <> <Link onClick={onClick}>{val}</Link> <CopyButton fontsize={13} value={val} /></>

const TransactionLink = ({trx}) => <> <Link rel="noopener noreferrer" target="_blank" to={tx_detail(trx)}>{trx}</Link> <CopyButton fontsize={13} value={trx} /></>
//const TransactionLink = ({trx}) => <> <Link rel="noopener noreferrer" target="_blank" to={tx_detail(trx)}>{trx}</Link> <CopyButton fontsize={13} value={trx} /></>
const AccountRef = ({account}) => <Link to={"/account/"+account}>{account.substring(0,24)+"..."} </Link>
const CopyAccountRef = ({account}) => <><AccountRef account={account} /><CopyButton fontsize={13} value={account} /> </>

const TokenRef = ({token}) => <Link to={"/token/"+token}>{token.substring(0,24)+"..."} </Link>
const CopyTokenRef = ({token}) => <><TokenRef token={token} /><CopyButton fontsize={13} value={token} /> </>
const CopyToken = ({token}) => <>{token.substring(0,24)+"..."} <CopyButton fontsize={13} value={token} /> </>
*/
