/* eslint-disable react/jsx-props-no-spreading */
import React, {
  ReactNode,
  useCallback,
} from 'react';
import {
  Form,
  Button,
  FormInstance,
} from 'antd';
import {
  func,
  object,
  bool,
  array,
} from 'prop-types';
import { map } from 'lodash/fp';
import useForm, { OnSubmit } from '../../hooks/use-form';
import Error from './error';
import Field, { FieldProps } from './field';

const { Item } = Form;

export interface FormProps<Values, SubmitReturn = any> {
  initialValues?: Partial<Values>
  onSubmit: OnSubmit<Values, SubmitReturn>
  fields?: FieldProps[]
  getFields?: (form: FormInstance<Values>) => FieldProps[]
  checkEditing?: boolean
  submitText?: string
  resetText?: string
}

function RelientForm<Values, SubmitReturn = any>({
  initialValues,
  onSubmit,
  fields,
  getFields,
  checkEditing,
  submitText = '提交',
  resetText = '重置',
}: FormProps<Values, SubmitReturn>) {
  const {
    submit,
    submitting,
    defaultError,
    invalid,
    pristine,
    onFieldsChange,
    form,
  } = useForm(onSubmit, [], checkEditing, true);
  const reset = useCallback(() => form.resetFields(), [form.resetFields]);

  return (
    <Form<Values> onFinish={submit} form={form} initialValues={initialValues} onFieldsChange={onFieldsChange}>
      <Error error={defaultError} />

      {map<FieldProps, ReactNode>(
        (field) => {
          const { name, label } = field;
          let key = '';
          if (name) {
            key = name.toString();
          } else if (label) {
            key = label.toString();
          }
          return <Field key={key} {...field} />;
        },
      )(fields || (getFields && getFields(form)))}

      <Item wrapperCol={{ span: 10, offset: 8 }}>
        <Button
          size="large"
          htmlType="submit"
          style={{ marginRight: 10 }}
          type="primary"
          loading={submitting}
          disabled={invalid || pristine}
        >
          {submitText}
        </Button>
        <Button size="large" htmlType="button" onClick={reset}>
          {resetText}
        </Button>
      </Item>
    </Form>
  );
}

RelientForm.propTypes = {
  onSubmit: func.isRequired,
  initialValues: object,
  fields: array,
  getFields: func,
  layout: object,
  checkEditing: bool,
};

export default RelientForm;
