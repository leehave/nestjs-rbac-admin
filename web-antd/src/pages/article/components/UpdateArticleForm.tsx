import React from 'react';
import { App } from 'antd';
import { EditFormModal } from '@/components';
import { updateArticle, getArticle } from '@/services/article';

interface UpdateArticleFormProps {
  trigger: JSX.Element;
  values: any;
  formRender: JSX.Element;
  onFinish?: () => void;
}

const UpdateArticleForm: React.FC<UpdateArticleFormProps> = (props) => {
  const { message } = App.useApp();
  const { trigger, values, formRender, onFinish } = props;

  return (
    <EditFormModal
      title="编辑文章"
      request={async () => {
        const res = await getArticle(values.id);
        return res.data;
      }}
      trigger={trigger}
      formRender={formRender}
      onFinish={async (formValues) => {
        const hide = message.loading('更新中...');
        try {
          await updateArticle({ ...values, ...formValues });
          onFinish?.();
          hide();
          message.success('更新成功');
          return true;
        } catch {
          hide();
          message.error('更新失败');
          return false;
        }
      }}
    />
  );
};

export default UpdateArticleForm;
