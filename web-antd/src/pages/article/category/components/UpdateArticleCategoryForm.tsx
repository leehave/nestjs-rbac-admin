import React from 'react';
import { App } from 'antd';
import { EditFormModal } from '@/components';
import { updateArticleCategory, getArticleCategory } from '@/services/articleCategory';

interface UpdateArticleCategoryFormProps {
  trigger: JSX.Element;
  values: any;
  formRender: JSX.Element;
  onFinish?: () => void;
}

const UpdateArticleCategoryForm: React.FC<UpdateArticleCategoryFormProps> = (props) => {
  const { message } = App.useApp();
  const { trigger, values, formRender, onFinish } = props;

  return (
    <EditFormModal
      title="编辑分类"
      request={async () => {
        const res = await getArticleCategory(values.id);
        return res.data;
      }}
      trigger={trigger}
      formRender={formRender}
      onFinish={async (formValues) => {
        const hide = message.loading('更新中...');
        try {
          await updateArticleCategory({ ...values, ...formValues });
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

export default UpdateArticleCategoryForm;
