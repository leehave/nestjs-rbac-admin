import * as ExcelJS from 'exceljs';
import type { Response } from 'express-serve-static-core';

import { StatusEnum, SexEnum, DelFlagEnum } from '../enum/index';

export const commonExportMap: Record<string, Record<string, string>> = {
  status: {
    [StatusEnum.NORMAL]: '正常',
    [StatusEnum.STOP]: '停用',
  },
  sex: {
    [SexEnum.MAN]: '男',
    [SexEnum.WOMAN]: '女',
  },
  delFlag: {
    [DelFlagEnum.NORMAL]: '正常',
    [DelFlagEnum.DELETE]: '已删除',
  },
};

/**
 * 导出表格数据为 Excel 文件
 * @param options - 导出配置项，包含数据、表头、字典映射、工作表名称
 * @param options.data - 要导出的数据行数组
 * @param options.header - 表头列定义，每项包含 title/header、dataIndex/key、width、formateStr
 * @param options.dictMap - 字段值到显示文本的映射字典（如状态、性别枚举）
 * @param options.sheetName - 工作表名称，默认为 "Sheet1"
 * @param res - Express 响应对象，用于输出文件流
 */
export async function ExportTable(
  options: {
    data: any[];
    header: Array<{
      title?: string;
      dataIndex?: string;
      header?: string;
      key?: string;
      width?: number;
      formateStr?: (val: any) => string;
    }>;
    dictMap?: any;
    sheetName?: string;
  },
  res: Response,
) {
  const data = options.data;
  const workbook = new ExcelJS.Workbook();
  const sheetName = options.sheetName || 'Sheet1';
  const worksheet = workbook.addWorksheet(sheetName);

  const normalizedHeader = options.header.map((column) => ({
    title: column.title ?? column.header ?? '',
    dataIndex: column.dataIndex ?? column.key ?? '',
    width: column.width,
    formateStr: column.formateStr,
  }));

  worksheet.columns = normalizedHeader.map((column) => ({
    header: column.title,
    key: column.dataIndex,
    width: column.width != null && !isNaN(column.width) ? column.width : 16,
  }));

  const dictMap = { ...commonExportMap, ...options.dictMap };

  const rows = data.map((item) => {
    const newItem: Record<string, any> = {};
    normalizedHeader.forEach((field) => {
      const dataIndex = field.dataIndex;
      const dataValue = item[dataIndex];
      if (dictMap && dictMap[dataIndex]) {
        newItem[dataIndex] = dictMap[dataIndex][dataValue] !== undefined ? dictMap[dataIndex][dataValue] : dataValue;
      } else {
        newItem[dataIndex] = dataValue;
      }
      if (field.formateStr && typeof field.formateStr === 'function') {
        newItem[dataIndex] = field.formateStr(newItem[dataIndex]);
      }
    });
    return newItem;
  });

  const headerStyle: any = {
    font: { size: 10, bold: true, color: { argb: 'ffffff' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '808080' } },
    border: {
      top: { style: 'thin', color: { argb: '9e9e9e' } },
      left: { style: 'thin', color: { argb: '9e9e9e' } },
      bottom: { style: 'thin', color: { argb: '9e9e9e' } },
      right: { style: 'thin', color: { argb: '9e9e9e' } },
    },
  };

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  rows.forEach((item) => {
    worksheet.addRow(item);
  });

  worksheet.columns.forEach((column) => {
    column.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment;filename=sheet.xlsx');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(buffer, 'binary');
}
