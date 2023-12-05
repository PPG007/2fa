import { App as AntApp, Button, Input, InputNumber, Progress, QRCode, Skeleton, Space } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import { fetchQRCode, verify } from './axios.ts';
import style from './otp.module.css';
import {totp, hotp} from '@ppg007/otp';

type TOTPAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

interface OTPProps {
  type: 'totp' | 'hotp';
}

interface OTPConfig {
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
  counter: number;
}

const getTOTPAlgorithm = (algorithm: string): TOTPAlgorithm => {
  switch (algorithm.toUpperCase()) {
    case 'SHA256':
      return 'SHA-256';
    case 'SHA512':
      return 'SHA-512';
    default:
      return 'SHA-1';
  }
};

const parseURL = (url: string): OTPConfig => {
  const params = (new URL(url)).searchParams;
  return {
    secret: params.get('secret') || '',
    digits: parseInt(params.get('digits') || '6'),
    period: parseInt(params.get('period') || '30'),
    algorithm: params.get('algorithm') || 'SHA1',
    counter: parseInt(params.get('counter') || '0'),
  };
};

const genTOTP = (params: OTPConfig): string => {
  return totp({
    digits: params.digits,
    period: params.period,
    algorithm: getTOTPAlgorithm(params.algorithm),
    secret: params.secret,
  })
};

const genHOTP = (params: OTPConfig, counter: number): string => {
  return hotp({
    digits: params.digits,
    counter,
    algorithm: getTOTPAlgorithm(params.algorithm),
    secret: params.secret,
  })
};

const getRestSecond = (period: number = 30) => {
  const now = Date.now() / 1000;
  const twc = Math.floor(now / period);
  const nextTwc = (twc + 1) * period;
  return nextTwc - now;
};

const OTP: FC<OTPProps> = ({type}) => {
  const [email, setEmail] = useState('');
  const [url, setURL] = useState('');
  const intervalId = useRef<NodeJS.Timeout>();
  const [input, setInput] = useState('');
  const {message} = AntApp.useApp();
  const [password, setPassword] = useState('');
  const [percent, setPercent] = useState(0);
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    if (!url) {
      return;
    }
    if (type === 'hotp') {
      const params = parseURL(url);
      setCounter(params.counter);
      setPassword(genHOTP(params, params.counter));
      return;
    }
    const id = setInterval(() => {
      const params = parseURL(url);
      setPassword(genTOTP(params));
      setPercent(getRestSecond(params.period) * 100 / params.period);
    }, 1000);
    intervalId.current = id;
    return () => {
      clearInterval(id);
    };
  }, [url]);

  useEffect(() => {
    if (url) {
      setPassword(genHOTP(parseURL(url), counter));
    }
  }, [counter]);

  useEffect(() => {
    if (email) {
      onQRCodeFetch();
    }
  }, [type]);

  const onQRCodeFetch = async () => {
    const resp = await fetchQRCode(email, type);
    setURL(resp.data.url);
    message.success('qrcode updated');
  };

  const onVerify = async () => {
    try {
      await verify(input, email, type);
      message.success('ok');
      if (type === 'hotp') {
        setCounter((c) => c + 1);
      }
    } catch (e) {
      message.error('wrong password');
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(password);
    message.success('copied');
  };
  return (
    <Space size={'large'} direction={'vertical'}>
      <div className={style.qrcode}>
        {
          url ? <QRCode value={url || 'loading'}/> : <Skeleton.Image/>
        }
      </div>
      <div>
        <Space.Compact>
          <Input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder={'email'}
          />
          <Button type={'primary'} onClick={onQRCodeFetch}>fetchQRCode</Button>
        </Space.Compact>
      </div>
      <div>
        <Space.Compact>
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            placeholder={'input password'}
          />
          <Button onClick={onVerify}>verify</Button>
        </Space.Compact>
      </div>
      <div>
        <Space.Compact>
          <Input disabled value={password}/>
          <Button onClick={onCopy}>copy</Button>
        </Space.Compact>
        {
          password && type === 'totp' ? (
            <Progress showInfo={false} percent={percent}/>
          ) : undefined
        }
      </div>
      {
        type === 'hotp' ? (
          <div>
            <InputNumber
              disabled
              value={counter}
              addonBefore={'counter: '}
            />
          </div>
        ) : undefined
      }
    </Space>
  );
};

export default OTP;