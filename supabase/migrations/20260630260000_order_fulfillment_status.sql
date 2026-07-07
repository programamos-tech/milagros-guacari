-- Estados de preparación/envío para pedidos web por transferencia.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_fulfillment_status') then
    create type public.order_fulfillment_status as enum (
      'awaiting_payment',
      'preparing',
      'shipped',
      'completed'
    );
  end if;
end
$$;

alter table public.orders
  add column if not exists fulfillment_status public.order_fulfillment_status;

comment on column public.orders.fulfillment_status is
  'Progreso de preparación/envío en pedidos web por transferencia.';

-- Pedidos transfer web existentes con comprobante → alistamiento + pagado.
update public.orders o
set
  fulfillment_status = 'preparing',
  status = 'paid'
where o.checkout_payment_method = 'transfer'
  and o.status = 'pending'
  and exists (
    select 1
    from public.order_transfer_proofs p
    where p.order_id = o.id
  );

-- Transfer web ya pagados sin fulfillment → finalizado.
update public.orders
set fulfillment_status = 'completed'
where checkout_payment_method = 'transfer'
  and status = 'paid'
  and fulfillment_status is null;

-- Transfer web pendientes sin comprobante → esperando pago.
update public.orders
set fulfillment_status = 'awaiting_payment'
where checkout_payment_method = 'transfer'
  and status = 'pending'
  and fulfillment_status is null;
