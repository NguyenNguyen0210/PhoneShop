import React from 'react';
import { useParams } from 'react-router-dom';
import { Customer360View } from '../../../components/common/Customer360View';

export const AdminCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Customer360View userId={id || ''} backPath="/admin/customers" />;
};

export default AdminCustomer360Page;
