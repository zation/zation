import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  concat,
  debounce,
  find,
  flow,
  isFunction,
  isNil,
  keyBy,
  map,
  mapValues,
  omitBy,
  prop,
  propEq,
  reduce,
  reject,
  join,
} from 'lodash/fp';
import { message } from 'antd';
import { useI18N } from 'relient/i18n';
import { Moment } from 'moment';
import { DEFAULT_PAGE } from '../constants/pagination';
import TableHeader, { CreateButton } from '../components/table-header';
import useBasicTable from './use-basic-table';
import type {
  Option,
  Filter,
  FilterValue,
  DateValue,
  ShowTotal,
  Creator,
  Details,
  Editor,
  PaginationData,
  ID,
} from '../interface';

const omitEmpty = omitBy((val) => (isNil(val) || val === ''));

const getFilterParams = flow(
  keyBy('dataKey'),
  mapValues(prop('value')),
);

const getDateParams = reduce((result, { dataKey, value }) => {
  if (value && value.length > 1) {
    return {
      ...result,
      [`${dataKey}After`]: new Date(value[0]).toISOString(),
      [`${dataKey}Before`]: new Date(value[1]).toISOString(),
    };
  }
  return result;
}, {});

export interface ReadActionParams {
  [key: string]: any

  size: number
  page: number
}

export interface ReadAction<Model> {
  (params: ReadActionParams): Promise<{
    content: Model[]
    number: number
    size: number
    totalElements: number
  }>
}

async function onFetch<Modal>(
  queryValue: string | null | undefined,
  queryField: string,
  readAction: ReadAction<Modal>,
  setPaginationData: (paginationData: PaginationData) => void,
  size: number,
  filterValues: FilterValue[],
  dateValues: DateValue[],
  page: number,
  setIsLoading: (isLoading: boolean) => void,
  fussyKey: string | null | undefined,
) {
  setIsLoading(true);
  const {
    content,
    number,
    size: newSize,
    totalElements,
  } = await readAction(omitEmpty({
    [fussyKey || queryField]: queryValue,
    size,
    page,
    ...getFilterParams(filterValues),
    ...getDateParams(dateValues),
  }) as ReadActionParams);
  setIsLoading(false);
  setPaginationData({
    current: number,
    size: newSize,
    total: totalElements,
    ids: map(prop('id'))(content),
  });
}

const onQueryFetch = debounce(500, onFetch);

export interface UseApiTableParams<Model> {
  query?: {
    onFieldChange?: (fieldKey: string) => void
    onValueChange?: (value?: string) => void
    fields?: Option[]
    width?: number
    placeholder?: string
    fussyKey?: string
  }
  showReset?: boolean
  filters?: Filter[]
  createButton?: CreateButton
  datePickers?: {
    dataKey: string,
    label: string,
    onDateChange: (value: [string, string]) => void
    disabledDate: (date: Moment) => boolean
  }[]
  getDataSource: (state: any) => (ids: ID[]) => any
  pagination?: {
    size?: number
    showTotal?: ShowTotal
  }
  paginationInitialData: PaginationData
  readAction: ReadAction<Model>
  creator?: Creator
  editor?: Editor<Model>
  details?: Details<Model>
}

export default function useApiTable<Model = any>({
  query,
  showReset,
  filters,
  createButton,
  datePickers,
  getDataSource,
  pagination,
  paginationInitialData,
  paginationInitialData: {
    current: initialCurrent,
    total: initialTotal,
    ids: initialIds,
    size: initialSize,
  },
  readAction,
  creator,
  editor,
  details,
}: UseApiTableParams<Model>) {
  const { onFieldChange, onValueChange, fields, width, placeholder, fussyKey } = query || {};
  const {
    onSubmit: creatorSubmit,
    onClose: creatorOnClose,
    onOpen: creatorOnOpen,
  } = creator || {};
  const {
    onSubmit: editorSubmit,
    shouldReload,
    onClose: editorOnClose,
    onOpen: editorOnOpen,
    getInitialValues: getEditorInitialValues,
  } = editor || {};
  const {
    getDataSource: getDetailsDataSource,
    onOpen: detailsOnOpen,
    onClose: detailsOnClose,
  } = details || {};

  const [paginationData, setPaginationData] = useState<PaginationData>(paginationInitialData);
  useEffect(() => {
    if (initialCurrent !== paginationData.current
      || initialTotal !== paginationData.total
      || join(',')(initialIds) !== join(',')(paginationData.ids)
      || initialSize !== paginationData.size) {
      setPaginationData(paginationInitialData);
    }
  }, [initialSize, initialCurrent, initialTotal, join(',')(initialIds)]);
  const data = useSelector((state) => getDataSource(state)(paginationData.ids));
  const [isLoading, setIsLoading] = useState(false);
  const i18n = useI18N();

  const {
    dateValues,
    setDateValues,
    queryField,
    setQueryField,
    queryValue,
    setQueryValue,
    filterValues,
    setFilterValues,
    creatorVisible,
    editorVisible,
    editItem,
    openCreator,
    closeCreator,
    openEditor,
    closeEditor,
    reset,
    defaultQueryField,
    defaultFilterValues,
    openDetails,
    closeDetails,
    detailsVisible,
    detailsItem,
  } = useBasicTable({
    fields,
    filters,
    editorOnOpen,
    editorOnClose,
    creatorOnOpen,
    creatorOnClose,
    detailsOnClose,
    detailsOnOpen,
  });

  const onQueryFieldChange = useCallback(async (fieldKey) => {
    setQueryField(fieldKey);
    setQueryValue('');
    if (isFunction(onFieldChange)) {
      onFieldChange(fieldKey);
    }
    if (isFunction(onValueChange)) {
      onValueChange('');
    }
    await onFetch(
      null,
      fieldKey,
      readAction,
      setPaginationData,
      paginationData.size,
      filterValues,
      dateValues,
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
  }, [
    readAction,
    paginationData.size,
    filterValues,
    dateValues,
    onFieldChange,
    onValueChange,
    fussyKey,
  ]);
  const onQueryValueChange = useCallback(({ target: { value } }) => {
    if (isFunction(onValueChange)) {
      onValueChange(value);
    }
    setQueryValue(value);
    onQueryFetch(
      value,
      queryField,
      readAction,
      setPaginationData,
      paginationData.size,
      filterValues,
      dateValues,
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
  }, [
    onValueChange,
    queryField,
    readAction,
    paginationData.size,
    filterValues,
    dateValues,
    fussyKey,
  ]);
  const onFilterValueChange = useCallback(async (value, dataKey) => {
    if (flow(
      find(propEq('dataKey')(dataKey)),
      propEq('value', value),
    )(filterValues)) {
      return null;
    }
    const onChange = flow(find(propEq('dataKey', dataKey)), prop('onFilterChange'))(filters);
    if (isFunction(onChange)) {
      onChange(value);
    }
    const newFilterValues = flow(
      reject(propEq('dataKey')(dataKey)),
      concat({
        dataKey,
        value,
      }),
    )(filterValues);
    setFilterValues(newFilterValues);
    return onFetch(
      queryValue,
      queryField,
      readAction,
      setPaginationData,
      paginationData.size,
      newFilterValues,
      dateValues,
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
  }, [
    filters,
    queryValue,
    queryField,
    readAction,
    paginationData.size,
    dateValues,
    fussyKey,
    filterValues,
  ]);
  const onDateChange = useCallback(async (value, dataKey) => {
    if (flow(
      find(propEq('dataKey')(dataKey)),
      propEq('value', value),
    )(filterValues)) {
      return null;
    }
    const onChange = flow(find(propEq('dataKey', dataKey)), prop('onDateChange'))(datePickers);
    if (isFunction(onChange)) {
      onChange(value);
    }
    const newDates = flow(
      reject(propEq('dataKey')(dataKey)),
      concat({
        dataKey,
        value,
      }),
    )(dateValues);
    setDateValues(newDates);
    return onFetch(
      queryValue,
      queryField,
      readAction,
      setPaginationData,
      paginationData.size,
      filterValues,
      newDates,
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
  }, [
    datePickers,
    dateValues,
    queryValue,
    queryField,
    readAction,
    paginationData.size,
    filterValues,
    fussyKey,
  ]);
  const onReset = useCallback(() => {
    reset();

    onFetch(
      null,
      defaultQueryField,
      readAction,
      setPaginationData,
      paginationData.size,
      defaultFilterValues,
      [],
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
  }, [
    defaultQueryField,
    defaultFilterValues,
    readAction,
    reset,
    fussyKey,
  ]);
  const onPageChange = useCallback((page, pageSize) => {
    const { current, size } = paginationData;
    if (current !== page - 1 || size !== pageSize) {
      onFetch(
        queryValue,
        queryField,
        readAction,
        setPaginationData,
        pageSize,
        filterValues,
        dateValues,
        page - 1,
        setIsLoading,
        fussyKey,
      );
    }
  }, [
    queryValue,
    queryField,
    readAction,
    paginationData.size,
    filterValues,
    dateValues,
    fussyKey,
    paginationData.current,
  ]);
  const onReload = useCallback(() => onFetch(
    queryValue,
    queryField,
    readAction,
    setPaginationData,
    paginationData.size,
    filterValues,
    dateValues,
    paginationData.current,
    setIsLoading,
    fussyKey,
  ), [
    queryValue,
    queryField,
    readAction,
    paginationData.size,
    filterValues,
    dateValues,
    paginationData.current,
    fussyKey,
  ]);
  const onCreatorSubmit = useCallback(async (values, formInstance) => {
    if (creatorSubmit) {
      await creatorSubmit(values, formInstance);
    }
    await onFetch(
      queryValue,
      queryField,
      readAction,
      setPaginationData,
      paginationData.size,
      filterValues,
      dateValues,
      DEFAULT_PAGE,
      setIsLoading,
      fussyKey,
    );
    closeCreator();
    message.success(i18n('createSuccess'));
  }, [
    creatorSubmit,
    queryValue,
    queryField,
    readAction,
    paginationData.size,
    filterValues,
    dateValues,
    fussyKey,
  ]);
  const onEditorSubmit = useCallback(async (values, formInstance) => {
    if (editorSubmit) {
      await editorSubmit({ ...values, id: (editItem as any)?.id }, formInstance, editItem);
    }
    if (shouldReload) {
      await onReload();
    }
    closeEditor();
    message.success(i18n('editSuccess'));
  }, [
    editorSubmit,
    editItem,
    shouldReload,
    onReload,
  ]);

  return {
    data,
    openCreator,
    openEditor,
    openDetails,
    reload: onReload,
    reset: onReset,
    isLoading,
    filterValues,
    changeFilterValue: onFilterValueChange,
    changeDate: onDateChange,
    pagination: {
      showTotal: ((total) => `${i18n('totalPage', { total })}`) as ShowTotal,
      pageSize: paginationData.size,
      current: paginationData.current + 1,
      total: paginationData.total,
      onChange: onPageChange,
      ...pagination,
    },
    tableHeader: <TableHeader
      query={{
        onFieldChange: onQueryFieldChange,
        onValueChange: onQueryValueChange,
        value: queryValue,
        field: queryField,
        fields,
        width,
        placeholder,
        fussy: !!fussyKey,
      }}
      createButton={createButton}
      filter={{
        items: flow(
          reject(propEq('staticField', true)),
          map(({
            dataKey,
            ...others
          }) => ({
            dataKey,
            value: flow(find(propEq('dataKey')(dataKey)), prop('value'))(filterValues),
            ...others,
          })),
        )(filters),
        onSelect: onFilterValueChange,
      }}
      datePicker={{
        items: map(({ dataKey, ...others }) => ({
          dataKey,
          value: flow(find(propEq('dataKey')(dataKey)), prop('value'))(dateValues),
          ...others,
        }))(datePickers),
        onSelect: onDateChange,
      }}
      details={details && {
        ...details,
        dataSource: getDetailsDataSource
          ? getDataSource(detailsItem)
          : detailsItem,
        visible: detailsVisible,
        close: closeDetails,
      }}
      creator={creator && {
        ...creator,
        onSubmit: onCreatorSubmit,
        visible: creatorVisible,
        onClose: closeCreator,
      }}
      editor={editor && {
        ...editor,
        initialValues: getEditorInitialValues
          ? getEditorInitialValues(editItem)
          : editItem,
        onSubmit: onEditorSubmit,
        visible: editorVisible,
        onClose: closeEditor,
      }}
      openEditor={openEditor}
      openCreator={openCreator}
      reset={showReset ? onReset : undefined}
    />,
  };
}