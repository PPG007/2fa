import { Button, Card, Input, Progress, QRCode, Space } from "antd";
import { FC, useEffect, useRef, useState } from 'react'
import { fetchQRCode, verify } from "./axios.ts";
import { App as AntApp } from "antd";
import totp from 'totp-generator';
import style from './app.module.css';
const getPassword = (uri: string) => {
  const {searchParams} = new URL(uri);
  const secret = searchParams.get('secret');
  const digits = searchParams.get('digits') || '6';
  const period =searchParams.get('period') || '30';
  return totp(secret || '', {
    algorithm: 'SHA-512',
    period: parseInt(period),
    digits: parseInt(digits),
  })
}

const getDiffToNextTW = () => {
  const now = Date.now() / 1000
  const twc = Math.floor(now/30);
  const nextTwc = (twc+1)*30;
  return nextTwc - now
}

const App: FC = () => {
  const [email, setEmail] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const {message} = AntApp.useApp();
  const [password, setPassword] = useState('');
  const intervalId = useRef<NodeJS.Timeout>();
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    if (!uri) {
      return
    }
    const id = setInterval(() => {
      const p = getPassword(uri);
      if (p) {
        setPassword(p);
      }
      setPercent(getDiffToNextTW()*100/30);
    }, 1000);
    intervalId.current = id;
    return () => {
      clearInterval(id);
    }
  }, [uri]);
  const onSubmit = async () => {
    const resp = await fetchQRCode(email)
    setUri(resp.data.uri);
  }
  const onVerify = async () => {
    try {
      await verify(code, email)
      message.success('验证成功');
    } catch (e) {
      message.error('验证失败');
    }
  }

  const onCopy = async () => {
    await navigator.clipboard.writeText(password);
    message.success('copied')
  }

  return (
    <Card className={style.card}>
      <Space direction={'vertical'} size={'large'}>
        <div>
          <Space.Compact>
            <Input
              value={email}
              onChange={(e) => {setEmail(e.target.value)}}
            />
            <Button type={'primary'} onClick={onSubmit}>submit</Button>
          </Space.Compact>
        </div>
        <div>
          <Space.Compact>
            <Input value={code} onChange={(e) => {setCode(e.target.value)}}/>
            <Button onClick={onVerify}>verify</Button>
          </Space.Compact>
        </div>
        <div>
          <Space.Compact>
            <Input disabled value={password}/>
            <Button onClick={onCopy}>copy</Button>
          </Space.Compact>
          {
            password ? (
              <Progress
                showInfo={false}
                percent={percent}
              />
            ) : undefined
          }
        </div>
        {
          uri ? <QRCode value={uri}/> : undefined
        }
      </Space>
    </Card>
  )
}

export default App
