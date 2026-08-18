import React from 'react';
import { App } from 'antd';
import { EditFormModal } from '@/components';
import { addArticle } from '@/services/article';

interface CreateArticleFormProps {
  trigger: JSX.Element;
  values?: any;
  formRender: JSX.Element;
  onFinish?: () => void;
}

const CreateArticleForm: React.FC<CreateArticleFormProps> = (props) => {
  const { message } = App.useApp();
  const { trigger, values, formRender, onFinish } = props;

  return (
    <EditFormModal
      title="新增文章"
      values={values}
      trigger={trigger}
      formRender={formRender}
      onFinish={async (formValues) => {
        const hide = message.loading('新增中...');
        try {
          await addArticle(formValues);
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

export default CreateArticleForm;
