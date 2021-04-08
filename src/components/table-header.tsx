/* eslint-disable react/jsx-props-no-spreading */
import React, { ChangeEvent, MouseEventHandler } from 'react';
import {
  func,
  object,
  bool,
} from 'prop-types';
import { Input, Button, Select, DatePicker } from 'antd';
import { map, flow, join, prop } from 'lodash/fp';
import { useI18N } from 'relient/i18n';
import type { OptionType } from 'antd/es/select';
import type { OptionData, OptionGroupData } from 'rc-select/es/interface';
import type { Moment } from 'moment';
import type { DetailsProps } from './details';
import Link from './link';
import FormPop, { FormPopProps } from './form/pop';
import Details from './details';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export interface QueryField {
  text?: string
  value?: string
}

export interface FilterOption extends Omit<OptionType, 'children'> {
  text?: string
}

export interface FilterItem {
  label?: string
  placeholder?: string
  options: FilterOption[]
  dataKey: string
  disabled?: boolean
  value?: string | number
}

export interface DatePickerItem {
  label?: string,
  dataKey: string,
  disabledDate: (date: Moment) => boolean,
}

export interface TableHeaderProps {
  query?: {
    onFieldChange: (value: any, option: OptionData | OptionGroupData) => void
    onValueChange: (event?: ChangeEvent<HTMLInputElement>) => void
    field?: string
    value?: string
    width?: number
    fields?: QueryField[]
    placeholder?: string
    fussy?: boolean
  }
  createButton?: {
    text: string
    link?: string
    onClick: MouseEventHandler<HTMLElement>
  }
  filter: {
    items: FilterItem[]
    onSelect: (selectedValue: any, dataKey: string) => void
  }
  reset?: () => void
  datePicker?: {
    items: DatePickerItem[]
    onSelect: (selectedValue: [string, string], dataKey: string) => void
  }
  details?: DetailsProps
  creator?: FormPopProps
  editor?: FormPopProps
  openCreator?: () => void
  openEditor?: (dataSource?: any) => void
}

const result = ({
  query,
  createButton,
  filter,
  reset,
  datePicker,
  details,
  creator,
  openCreator,
  editor,
}: TableHeaderProps) => {
  const i18n = useI18N();

  return (
    <div className="relient-admin-table-header-root">
      {details && <Details {...details} />}

      {creator && <FormPop {...creator} />}

      {editor && <FormPop {...editor} />}

      <div className="relient-admin-table-header-button-wrapper">
        {createButton && (createButton.link ? (
          <Link to={createButton.link}>
            <Button type="primary" size="large">
              {createButton.text}
            </Button>
          </Link>
        ) : (
          <Button type="primary" size="large" onClick={createButton.onClick || openCreator}>
            {createButton.text}
          </Button>
        ))}
      </div>

      <div className="relient-admin-table-header-operations">
        {filter && map(({
          label,
          options,
          placeholder,
          dataKey,
          value,
          dropdownMatchSelectWidth = false,
        }) => (
          <div key={dataKey}>
            <span className="relient-admin-table-header-operation-label">{label}</span>
            <Select
              onSelect={(selectedValue) => filter.onSelect(selectedValue, dataKey)}
              placeholder={placeholder}
              value={value}
              dropdownMatchSelectWidth={dropdownMatchSelectWidth}
            >
              {map(({ text, value: optionValue, disabled, className: optionClassName }) => (
                <Option
                  value={optionValue}
                  key={optionValue}
                  disabled={disabled}
                  className={optionClassName}
                >
                  {text}
                </Option>
              ))(options)}
            </Select>
          </div>
        ))(filter.items)}

        {datePicker && map(({ label, dataKey, disabledDate }) => (
          <div key={dataKey}>
            <span className="relient-admin-table-header-operation-label">{label}</span>
            <RangePicker
              format="YYYY-MM-DD"
              onChange={(
                _,
                selectedValue,
              ) => datePicker.onSelect(selectedValue, dataKey)}
              disabledDate={disabledDate}
            />
          </div>
        ))(datePicker.items)}

        {query && (query.fussy || query.fields) && (
          <div>
            {!query.fussy && (
              <Select
                onSelect={query.onFieldChange}
                value={query.field}
                className="relient-admin-table-header-operation-label"
                dropdownMatchSelectWidth={false}
              >
                {map(({ key, text }) => (
                  <Option
                    value={key}
                    key={key}
                  >
                    {text}
                  </Option>
                ))(query.fields)}
              </Select>
            )}
            <Search
              style={{ width: query.width || 362 }}
              placeholder={query.placeholder || (query.fussy
                ? i18n('searchBy', { keywords: flow(map(prop('text')), join('、'))(query.fields) })
                : i18n('search')) as string}
              onChange={query.onValueChange}
              value={query.value}
            />
          </div>
        )}

        {reset && (
          <Button onClick={reset}>{i18n('reset')}</Button>
        )}
      </div>
    </div>
  );
};

result.propTypes = {
  query: object,
  createButton: object,
  filter: object,
  details: object,
  detailsVisible: bool,
  closeDetails: func,
  creator: object,
  editor: object,
  openCreator: func,
  openEditor: func,
  closeCreator: func,
  closeEditor: func,
  creatorVisible: bool,
  editorVisible: bool,
  onCreateSubmit: func,
  onEditSubmit: func,
  datePicker: object,
  reset: func,
};

result.displayName = __filename;

export default result;