import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';


@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }
  async fetchAll(school_id?: number) {
    const accountsCash = await this.prisma.studentFees.findMany({
      where: { school_id: Number(school_id),payments:{
        every:{
          method:'cash'
        }
      } },
      select: { paid_amount: true }
    });
    const accountsOnline = await this.prisma.studentFees.findMany({
      where: { school_id: Number(school_id),payments:{
        every:{
          method:'online'
        }
      } },
      select: { paid_amount: true }
    });
    const busCash = await this.prisma.busFeePayment.findMany({
      where: { school_id: Number(school_id),payment_mode:'CASH' },
      select: { amount_paid: true }
    });
    const busOnline = await this.prisma.busFeePayment.findMany({
      where: { school_id: Number(school_id),payment_mode:'ONLINE' },
      select: { amount_paid: true }
    });
    const rteCash = await this.prisma.rteFeePayment.findMany({
      where: { school_id: Number(school_id) ,payment_mode:'cash'},
      select: { amount_paid: true }
    });
    const rteOnline = await this.prisma.rteFeePayment.findMany({
      where: { school_id: Number(school_id),payment_mode:'online' },
      select: { amount_paid: true }
    });
    // helper to sum amounts
    const sum = (arr: Array<{ paid_amount?: number; amount_paid?: number }>) =>
      arr.reduce((acc, curr) => acc + (curr.paid_amount ?? curr.amount_paid ?? 0), 0);

    const totals = {
      termCash: sum(accountsCash),
      termOnline:  sum(accountsOnline),
      termFeesTotal: sum(accountsCash) + sum(accountsOnline),
      busCash: sum(busCash) ,
      busOnline:  sum(busOnline),
      busFeeTotal: sum(busCash) + sum(busOnline),
      rteCash: sum(rteCash),
      rteFeesOnline:  sum(rteOnline),
      rteFeesTotal: sum(rteCash) + sum(rteOnline),
      grandTotal: sum(accountsCash) + sum(accountsOnline) + sum(busCash) + sum(busOnline) + sum(rteCash) + sum(rteOnline),
    };
    return totals;
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

    const accountsCash = await this.prisma.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'CASH'
  AND DATE(fp.payment_date) BETWEEN ${fromDate} AND ${toDate}
`;

    const accountsOnline = await this.prisma.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'ONLINE'
  AND DATE(fp.payment_date) BETWEEN ${fromDate} AND ${toDate}
`;


    const busCash = await this.prisma.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'CASH'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const busOnline = await this.prisma.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'ONLINE'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const rteCash = await this.prisma.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'cash'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const rteOnline = await this.prisma.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'online'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const finance = await this.prisma.$queryRaw<
      { amount: number }[]
    >`
    SELECT amount,reason,type
    FROM Finance
    WHERE school_id = ${school_id}
    AND DATE(updated_at) BETWEEN ${fromDate} AND ${toDate};
  `;

    let finTot = 0;

    const sum = (arr: any[]) =>
      arr.reduce(
        (acc, curr) =>
          acc + (curr.paid_amount ?? curr.amount_paid ?? 0),
        0
      );
    for (var i = 0; i < finance.length; i++) {


      finTot += (finance[i]['amount'])
    }


    return {
      termCash: sum(accountsCash),
      termOnline: sum(accountsOnline),
      termFeesTotal: sum(accountsCash) + sum(accountsOnline),
      busCash: sum(busCash),
      busOnline: sum(busOnline),
      busFeeTotal: sum(busCash) + sum(busOnline),
      rteCash: sum(rteCash),
      rteOnline: sum(rteOnline),
      rteFeesTotal: sum(rteCash) + sum(rteOnline),
      finance,
      grandTotal: sum(accountsCash) + sum(accountsOnline) + sum(busCash) + sum(busOnline) + sum(rteCash) + sum(rteOnline) + finTot,
    };
  }



}