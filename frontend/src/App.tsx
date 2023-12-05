import { Card } from "antd";
import { FC, useState } from 'react';
import style from './app.module.css';
import OTP from './OTP.tsx';




const App: FC = () => {
  const [tab, setTab] = useState('totp');
  return (
    <Card
      className={style.card}
      tabList={[
        {
          key: 'totp',
          label: 'totp',
        },
        {
          key: 'hotp',
          label: 'hotp'
        }
      ]}
      activeTabKey={tab}
      onTabChange={(key) => {setTab(key)}}
    >
      <OTP type={tab === 'hotp' ? tab : 'totp'}/>
    </Card>
  )
}

export default App
