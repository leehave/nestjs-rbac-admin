import React from 'react';
import { App } from 'antd';
import { EditFormModal } from '@/components';
import { addArticleCategory } from '@/services/articleCategory';

interface CreateArticleCategoryFormProps {
  trigger: JSX.Element;
  values?: any;
  formRender: JSX.Element;
  onFinish?: () => void;
}

const CreateArticleCategoryForm: React.FC<CreateArticleCategoryFormProps> = (props) => {
  const { message } = App.useApp();
  const { trigger, values, formRender, onFinish } = props;

  return (
    <EditFormModal
      title="新增分类"
      values={values}
      trigger={trigger}
      formRender={formRender}
      onFinish={async (formValues) => {
        const hide = message.loading('新增中...');
        try {
          await addArticleCategory(formValues);
          onFinish?.();
          hide();
          message.success('新增成功');
          return true;
        } catch {
          hide();
          message.error('新增失败');
          return false;
        }
      }}
    />
  );
};

export default CreateArticleCategoryForm;
