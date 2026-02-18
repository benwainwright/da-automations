export interface ISampleStore<TSample> {
  save(sample: TSample): Promise<void>;
  getRange(fromDate: Date, toDate: Date): Promise<TSample[]>;
}
