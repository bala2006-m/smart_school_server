import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';


@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}
async fetchAll(school_id?: number) {
  const accounts = await this.prisma.studentFees.findMany({
    where: { school_id: Number(school_id) },
    select: { paid_amount: true }
  });

  const bus = await this.prisma.busFeePayment.findMany({
    where: { school_id: Number(school_id) },
    select: { amount_paid: true }
  });

  const rte = await this.prisma.rteFeePayment.findMany({
    where: { school_id: Number(school_id) },
    select: { amount_paid: true }
  });

  // helper to sum amounts
  const sum = (arr: Array<{ paid_amount?: number; amount_paid?: number }>) =>
    arr.reduce((acc, curr) => acc + (curr.paid_amount ?? curr.amount_paid ?? 0), 0);

  const totals = {
    termFeesTotal: sum(accounts),
    busFeeTotal: sum(bus),
    rteFeesTotal: sum(rte),
  };
return  totals;
//   return {
//     termFees: accounts,
//     busFee: bus,
//     rteFees: rte,
//     totals
//   };
}
async fetchAllPeriodical(school_id: number, from: Date, to: Date) {
  const format = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")}`;

  const fromDate = format(from);
  const toDate = format(to);

  const accounts = await this.prisma.$queryRaw<
    { paid_amount: number }[]
  >`
    SELECT paid_amount 
    FROM StudentFees
    WHERE school_id = ${school_id}
    AND DATE(createdAt) BETWEEN ${fromDate} AND ${toDate};
  `;

  const bus = await this.prisma.$queryRaw<
    { amount_paid: number }[]
  >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
    AND DATE(created_at) BETWEEN ${fromDate} AND ${toDate};
  `;

  const rte = await this.prisma.$queryRaw<
    { amount_paid: number }[]
  >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND DATE(created_at) BETWEEN ${fromDate} AND ${toDate};
  `;

  const sum = (arr: any[]) =>
    arr.reduce(
      (acc, curr) =>
        acc + (curr.paid_amount ?? curr.amount_paid ?? 0),
      0
    );

  return {
    termFeesTotal: sum(accounts),
    busFeeTotal: sum(bus),
    rteFeesTotal: sum(rte),
    grandTotal: sum(accounts) + sum(bus) + sum(rte),
  };
}



}