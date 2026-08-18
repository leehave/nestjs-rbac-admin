import { SelectLang, ToggleFullscreenBtn } from '@/components/Layout';
import { queryCaptchaImage, queryTenantsByUsername } from '@/services/auth';
import {
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
  GithubOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
  ProFormSelect,
} from '@ant-design/pro-components';
import { useRequest } from 'ahooks';
import { App, Button, Space, Tabs, message } from 'antd';
import { Logo } from '@/components/Layout';
import { useT, T } from '@/locales';
import { createStyles } from 'antd-style';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/stores';

const useStyles = createStyles(({ token, css }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    captchaImage: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      overflow: 'hidden',
      height: 40,
      width: 100,
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    tools: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: token.paddingSM,
      gap: 4,
    },
    footer: css`
      padding-block-start: ${token.paddingXL}px;
      padding-block-end: ${token.paddingLG}px;
      padding-inline: ${token.padding}px;
      text-align: center;

      p {
        color: ${token.colorTextTertiary};
        font-size: ${token.fontSize}px;
        margin-bottom: 0;
      }
    `,
  };
});

// 图形验证码
const CaptchaImage: React.FC<{
  value?: string;
  onSuccess: (uuid: string) => void;
  onRefresh?: () => void;
}> = ({ onSuccess, onRefresh }) => {
  const { styles } = useStyles();
  const { refresh, data, loading, error } = useRequest(queryCaptchaImage, {
    onSuccess(res) {
      const uuid = res?.uuid;
      if (uuid) onSuccess(uuid);
    },
  });

  const handleRefresh = useCallback(() => {
    refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  if (error) {
    return (
      <Button className={styles.captchaImage} size="large" danger onClick={handleRefresh}>
        <T id="page.login.captcha.getCaptchaText" />
      </Button>
    );
  }

  if (loading) {
    return (
      <Button className={styles.captchaImage} size="large" loading>
        <T id="layout.loading" />
      </Button>
    );
  }

  return (
    <Button className={styles.captchaImage} size="large" onClick={handleRefresh}>
      <img
        src={data?.image}
        alt="captcha"
        style={{ width: 100, height: 40, display: 'block', cursor: 'pointer' }}
      />
    </Button>
  );
};

export const Component: React.FC = () => {
  const t = useT();
  const app = App.useApp();
  const { loginAccount, fetchProfile, setProfile } = useProfileStore();
  const [type, setType] = useState<string>('account');
  const [uuid, setUUID] = useState('');
  const [tenantList, setTenantList] = useState<API.TenantItem[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const navigate = useNavigate();
  const { styles } = useStyles();
  const formRef = useRef<any>();

  // 加载租户列表
  const loadTenantList = useCallback(async (username: string) => {
    if (!username || !username.trim()) {
      setTenantList([]);
      return;
    }
    try {
      setLoadingTenants(true);
      const res = await queryTenantsByUsername(username.trim());
      const list = (res as any)?.data || res || [];
      setTenantList(list);
      // 如果只有一个租户，自动选中
      if (list.length === 1) {
        formRef.current?.setFieldsValue?.({ tenant_id: list[0].id });
      } else if (list.length > 0) {
        const defaultTenant = list.find((t: API.TenantItem) => t.is_default);
        if (defaultTenant) {
          formRef.current?.setFieldsValue?.({ tenant_id: defaultTenant.id });
        }
      }
    } catch {
      setTenantList([]);
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  // 登录
  const handleSubmit = async (values: any) => {
    const { username, password, code, autoLogin, tenant_id } = values;
    try {
      const res = await loginAccount({
        username,
        password,
        code,
        uuid,
        tenant_id,
      });

      if (res.code === 200) {
        // 获取用户信息并存储
        const profileRes = await fetchProfile();
        if (profileRes.code === 200 && profileRes.data) {
          setProfile(profileRes.data);
        }
        app.message.success(t('page.login.success'));
        const urlParams = new URL(window.location.href).searchParams;
        navigate(urlParams.get('redirect') || '/');
        return;
      }
    } catch (error) {
      // 登录失败不额外提示，后端已返回错误信息
    }
    // 登录失败刷新验证码
    setCaptchaKey((k) => k + 1);
  };

  // 初始化：加载默认租户
  useEffect(() => {
    const initialValues = { username: 'admin' };
    loadTenantList('admin');
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.tools}>
        <SelectLang />
        <ToggleFullscreenBtn />
      </div>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          formRef={formRef}
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<Logo style={{ fontSize: 44 }} />}
          title="RBAC Admin"
          subTitle={<T id="page.login.subTitle" />}
          initialValues={{
            username: 'admin',
            password: 'admin123',
            autoLogin: true,
          }}
          onFinish={async (values: any) => {
            await handleSubmit(values);
          }}
          onValuesChange={(changedValues: any) => {
            if (changedValues.username !== undefined) {
              setTenantList([]);
              loadTenantList(changedValues.username);
            }
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: <T id="page.login.tab.accountLogin" />,
              },
              {
                key: 'mobile',
                label: <T id="page.login.tab.phoneLogin" />,
                disabled: true,
              },
            ]}
          />
          {type === 'account' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={t('component.form.placeholder', {
                  label: t('page.login.field.user'),
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <T
                        id="component.form.placeholder"
                        values={{ label: <T id="page.login.field.user" /> }}
                      />
                    ),
                  },
                ]}
              />
              <ProFormSelect
                name="tenant_id"
                fieldProps={{
                  size: 'large',
                  prefix: <TeamOutlined />,
                  placeholder: tenantList.length > 0 ? '请选择租户' : '请先输入用户名',
                  disabled: tenantList.length === 0,
                  loading: loadingTenants,
                  notFoundContent: null,
                }}
                options={tenantList.map((t) => ({
                  label: t.is_default ? (
                    <span>
                      {t.name}{' '}
                      <span style={{ color: 'var(--ant-color-primary)', marginLeft: 4 }}>
                        (默认)
                      </span>
                    </span>
                  ) : (
                    t.name
                  ),
                  value: t.id,
                }))}
                rules={[
                  {
                    required: true,
                    message: '请选择租户',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={t('component.form.placeholder', {
                  label: t('page.login.field.pswd'),
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <T
                        id="component.form.placeholder"
                        values={{ label: <T id="page.login.field.pswd" /> }}
                      />
                    ),
                  },
                ]}
              />
              <Space direction="horizontal" align="start" style={{ width: '100%' }}>
                <ProFormText
                  name="code"
                  fieldProps={{
                    size: 'large',
                    prefix: <SafetyOutlined />,
                  }}
                  placeholder={t('component.form.placeholder', {
                    label: t('page.login.field.captcha'),
                  })}
                  rules={[
                    {
                      required: true,
                      message: <T id="page.login.field.captcha.rule" />,
                    },
                  ]}
                />
                <CaptchaImage
                  key={captchaKey}
                  onSuccess={(uuid) => setUUID(uuid)}
                />
              </Space>
            </>
          )}
          {type === 'mobile' && <></>}
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              <T id="page.login.rememberMe" />
            </ProFormCheckbox>
            <a
              style={{
                float: 'right',
              }}
            >
              <T id="page.login.forgotPswd" />
            </a>
          </div>
        </LoginForm>
      </div>
      <div className={styles.footer}>
        <p>© 2026 RBAC Admin</p>
        <p>
          Powered by{' '}
          <a
            href="https://github.com/EmptyG2018/art-admin"
            target="_blank"
            style={{ color: 'inherit' }}
          >
            <GithubOutlined />
          </a>
        </p>
      </div>
    </div>
  );
};
