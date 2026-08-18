import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { Button, Result, Skeleton, Typography } from 'antd';
import { Loading, NoFound } from './components/Layout';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useProfileStore, useSystemStore } from '@/stores';

import { Admin } from '@/layouts';
import { Component as Login } from './pages/Login';
import { ProtectedRoute } from '@/components/Router';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Settings from './pages/Settings';
import { T } from '@/locales';

const LayoutMap: Record<string, React.ReactNode> = {
  Layout: <Outlet />,
  ParentView: <Outlet />,
};

const modules = import.meta.glob('./pages/**/*.tsx');


// Component path aliases: server path -> actual file path
const ComponentAliases: Record<string, string> = {
  '@/pages/Monitor/LoginLog/index': '@/pages/Monitor/Logininfor/index',
  '@/pages/Monitor/OperLog/index': '@/pages/Monitor/Operlog/index',
};

const loadLazyPage = (page: string) => {
  // Resolve component path aliases
  const resolvedPage = ComponentAliases[page] || page;
  for (const path in modules) {
    const dir = path.split('/pages')[1].split('.tsx')[0];
    // handle @/pages prefix from API response
    const normalizedPage = resolvedPage.replace('@/pages', '');
    // Try exact match, or append /index for index.tsx files
    const pageWithIndex = normalizedPage + '/index';
    if (dir === page || dir === normalizedPage || dir === pageWithIndex) {
      const LazyComponent = lazy(() =>
        modules[path]()
          .then((r: any) => ({ default: r.Component }))
          .catch(() => ({ default: () => <div /> })),
      );
      return (
        <Suspense fallback={<Skeleton style={{ padding: 40 }} />}>
          <LazyComponent />
        </Suspense>
      );
    }
  }

  return (
    <Result
      status="error"
      title={<T id="layout.route.404" />}
      subTitle={<T id="layout.route.404.subTitle" />}
    >
      <div className="desc">
        <Typography.Paragraph>
          <Typography.Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            <T id="layout.route.404.help" />
          </Typography.Text>
        </Typography.Paragraph>
        <Typography.Paragraph>
          <QuestionCircleOutlined className="site-result-demo-error-icon" />{' '}
          <T
            id="layout.route.404.message1"
            values={{
              path: <Typography.Text code>src/pages{page}.tsx</Typography.Text>,
            }}
          />
        </Typography.Paragraph>
        <Typography.Paragraph>
          <QuestionCircleOutlined className="site-result-demo-error-icon" />{' '}
          <T id="layout.route.404.message2" />
        </Typography.Paragraph>
      </div>
    </Result>
  );
};

const layoutElement = (element: string) => LayoutMap[element] || (!element ? <Outlet /> : <div />);

// Convert absolute path to relative path for nested routes
// e.g. "/system/user" inside parent "/system" -> "user"
const toRelativePath = (childPath: string, parentPath: string) => {
  if (childPath.startsWith(parentPath + '/')) {
    return childPath.slice(parentPath.length + 1);
  }
  // If child path is absolute but doesn't start with parent, use as-is
  // (React Router v6 will treat it as an absolute path)
  if (childPath.startsWith('/')) {
    return childPath.slice(1); // strip leading / for relative usage
  }
  return childPath;
};

const generateDeepRoutes = (routes: any, parentPath = '') => {
  if (!routes) return;
  if (!routes.length) return [];

  const filterRoutes = routes.map((route: any) => {
    const isSubMenu = !!route?.children;
    const element = isSubMenu
      ? layoutElement(route.component)
      : loadLazyPage(route.component);

    // Use relative path for nested routes to avoid path duplication
    const routePath = parentPath
      ? toRelativePath(route.path, parentPath)
      : route.path;

    const childRoutes = generateDeepRoutes(route?.children, route.path);
    // Add index redirect for parent menus: redirect to first visible child
    if (isSubMenu && route?.children?.length) {
      const firstVisibleChild = route.children.find(
        (child: any) => child.is_hidden !== 1 && child.hidden !== true,
      );
      if (firstVisibleChild) {
        childRoutes?.unshift(
          <Route
            index
            element={<Navigate to={firstVisibleChild.path} replace />}
            key={`${route.path}-index`}
          />,
        );
      }
    }

    return (
      <Route path={routePath} element={element} key={route.path}>
        {childRoutes}
      </Route>
    );
  });

  // Top-level index redirect to first visible route
  if (!parentPath) {
    const visibleRoute = routes.find((route: any) => route.is_hidden !== 1 && route.hidden !== true);
    if (visibleRoute) {
      filterRoutes.unshift(
        <Route
          index
          element={<Navigate to={visibleRoute.path} replace />}
          key="index"
        />,
      );
    }
  }

  return filterRoutes;
};

const Permission = () => {
  const { fetchProfile } = useProfileStore();
  const { menus, fetchConfig, fetchMenus } = useSystemStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchConfig(), fetchMenus()])
      .then(() => {
        setError('');
      })
      .catch((error) => {
        setError(error.toString());
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchProfile, fetchConfig, fetchMenus]);

  const dynamicRoutes = useMemo(() => {
    return generateDeepRoutes(menus);
  }, [menus]);

  if (loading)
    return (
      <div style={{ height: '100vh' }}>
        <Loading />
      </div>
    );

  if (error)
    return (
      <Result
        status="error"
        title={<T id="layout.config.error" />}
        subTitle={error}
        extra={[
          <Button
            type="primary"
            key="refresh"
            onClick={() => location.reload()}
          >
            <T id="layout.config.refresh" />
          </Button>,
        ]}
      ></Result>
    );

  return (
    <Admin
      element={
        <Routes>
          {dynamicRoutes}
          <Route path="/settings" element={<Settings />} />
          <Route path="/*" element={<NoFound />} />
        </Routes>
      }
    />
  );
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ProtectedRoute>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/404" element={<NoFound showHomeBtn />} />
          <Route path="/*" element={<Permission />} />
        </Routes>
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default AppRoutes;
