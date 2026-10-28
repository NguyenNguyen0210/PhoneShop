import React from 'react';
import { useParams } from 'react-router-dom';
import { Customer360View } from '../../../components/common/Customer360View';

export const StaffCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Customer360View userId={id || ''} backPath="/staff/customers" />;
};

export default StaffCustomer360Page;
