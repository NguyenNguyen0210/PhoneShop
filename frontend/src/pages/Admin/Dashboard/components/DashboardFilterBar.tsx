import { useMemo } from 'react';
import type React from 'react';
import { Radio, DatePicker, Tag, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DatePresetKey } from '../../../../types/report';

export interface DashboardFilterBarProps {
  preset: DatePresetKey;
  dateRange: [string, string];
  onPresetChange: (preset: DatePresetKey) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  preset,
  dateRange,
  onPresetChange,
  onCustomRangeChange,
  onRefresh,
  loading,
}) => {
  const rangeValue = useMemo<[dayjs.Dayjs, dayjs.Dayjs] | null>(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dayjs(dateRange[0]);
      const end = dayjs(dateRange[1]);
      if (start.isValid() && end.isValid()) {
        return [start, end];
      }
    }
    return null;
  }, [dateRange]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Radio.Group
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="7_DAYS">7 ngày qua</Radio.Button>
          <Radio.Button value="30_DAYS">30 ngày qua</Radio.Button>
          <Radio.Button value="THIS_MONTH">Tháng này</Radio.Button>
          <Radio.Button value="CUSTOM">Tùy chọn</Radio.Button>
        </Radio.Group>

        {preset === 'CUSTOM' && (
          <DatePicker.RangePicker
            value={rangeValue}
            format="YYYY-MM-DD"
            allowClear={false}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                onCustomRangeChange(
                  dates[0].format('YYYY-MM-DD'),
                  dates[1].format('YYYY-MM-DD')
                );
              }
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Tag color="blue" variant="filled" className="px-2.5 py-1 text-xs font-medium">
          Múi giờ: Asia/Ho_Chi_Minh
        </Tag>
        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          disabled={loading}
          className="font-medium"
        >
          Làm mới
        </Button>
      </div>
    </div>
  );
};
