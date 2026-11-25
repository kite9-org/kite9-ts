export class ContainerMergeType {
  static readonly WITHIN_LIVE_CONTAINER = new ContainerMergeType("WITHIN_LIVE_CONTAINER", 0);
  static readonly JOINING_EXTRA_CONTAINERS = new ContainerMergeType("JOINING_EXTRA_CONTAINERS", 20);
  static readonly NO_LIVE_CONTAINER = new ContainerMergeType("NO_LIVE_CONTAINER", 30);

  private constructor(
    readonly name: string,
    readonly priorityAdjustment: number,
  ) {}

  toString(): string {
    return this.name;
  }
}
