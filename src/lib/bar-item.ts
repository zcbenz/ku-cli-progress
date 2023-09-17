import { IBarOptions } from './interfaces/bar-options.interface';
import { IProgress } from './interfaces/progress.interface';
import { IBarItem } from './interfaces/bar-item.interface';

export interface IFormatters {
  [key: string]: (
    str: string,
    progress: IProgress,
    progresses: IProgress[],
  ) => string;
}

export interface IDataProviders {
  [key: string]: (progress: IProgress, progresses: IProgress[]) => string;
}

export interface IParams {
  tagDelimiter?: string;
  template?: string;
  options?: Partial<IBarOptions>;
  formatters?: IFormatters;
  dataProviders?: IDataProviders;
}

export class BarItem implements IBarItem {
  protected template!: string;
  protected tagDelimiter!: string;
  protected options: IBarOptions = {
    completeChar: '=',
    resumeChar: '-',
    width: 40,
    glue: '',
  };
  protected formatters!: IFormatters;
  protected dataProviders!: IDataProviders;
  protected progresses: IProgress[];

  public constructor(progresses: IProgress | IProgress[], params?: IParams) {
    this.progresses = Array.isArray(progresses) ? progresses : [progresses];
    this.tagDelimiter = params?.tagDelimiter ?? '_';
    this.template =
      params?.template ?? this.getDefaultTemplate(this.progresses);
    this.options = { ...this.options, ...params?.options };
    this.formatters = params?.formatters ?? {};
    const formatNumber = (num: number, suffix: string): string =>
      Number.isNaN(num) ? NaN.toString() : num + suffix;
    this.dataProviders = {
      bars: (progress, progresses) => this.renderBars(progresses),
      bar: progress => this.bar(progress.getProgress(), progress),
      speed: progress =>
        formatNumber(Math.round(progress.getEta().getSpeed()), '/s'),
      eta: progress => formatNumber(progress.getEta().getEtaS(), 's'),
      value: progress => progress.getValue().toString(),
      total: progress => progress.getTotal().toString(),
      percentage: progress => Math.round(progress.getProgress() * 100) + '%',
      duration: progress =>
        Math.round(progress.getEta().getDurationMs() / 1000) + 's',
      ...params?.dataProviders,
    };
  }

  public getProgresses(): IProgress[] {
    return this.progresses;
  }

  public render(): string {
    const next = this.getCounterByProperty(this.progresses.length);
    return this.template.replace(/{([^{}]+)}/g, (match, prop) => {
      const [property, tag] = prop.split(this.tagDelimiter).reverse();
      const index = tag
        ? this.progresses.findIndex(p => p.getTag() === tag)
        : next(property);
      if (index < 0) return match;
      const progress = this.progresses[index];
      const value = this.getDataValue(property, progress);
      if (value === null) {
        return match;
      }
      if (this.formatters[prop]) {
        return this.formatters[prop](value, progress, this.progresses);
      }
      return value;
    });
  }

  protected getCounterByProperty(max) {
    const map = new Map();
    return key => {
      const index = map.get(key) ?? 0;
      map.set(key, index + 1);
      if (index >= max) {
        return -1;
      }
      return index;
    };
  }

  protected getDefaultTemplate(progresses) {
    if (progresses.length > 1) {
      return `[{bars}] ${progresses
        .map(() => '{percentage}')
        .join('/')} ETA: ${progresses
        .map(() => '{eta}')
        .join('/')} speed: ${progresses
        .map(() => '{speed}')
        .join('/')} duration: ${progresses
        .map(() => '{duration}')
        .join('/')} ${progresses.map(() => '{value}/{total}').join(' ')}`;
    }
    return '[{bar}] {percentage} ETA: {eta} speed: {speed} duration: {duration} {value}/{total}';
  }

  protected bar(done: number, progress: IProgress): string {
    const size = Math.round(done * this.options.width);
    const parts = this.getBarParts(size, progress);
    return `${parts.done}${this.options.glue}${parts.left}`;
  }

  protected renderBarsLine(
    length: number,
    item: IProgress,
    progresses: IProgress[],
  ) {
    const line = this.getBarParts(length, item).done;
    const formatter =
      this.formatters[`${item.getTag()}${this.tagDelimiter}bar`] ??
      this.formatters['bar'];
    return formatter ? formatter(line, item, progresses) : line;
  }

  protected renderBars(progresses: IProgress[]): string {
    const { resumeChar, width, glue } = this.options;
    const lines = [];

    const leftLength = progresses
      .map((item, index) => ({
        size: Math.round(item.getProgress() * width),
        item,
        index,
      }))
      .sort((a, b) => Math.sign(a.size - b.size))
      .reduce(
        (prev, current) => {
          const length = current.size - prev.size;
          if (length > 0) {
            lines.push(this.renderBarsLine(length, current.item, progresses));
          }
          return current;
        },
        { size: 0 },
      );

    if (width - leftLength.size > 0) {
      lines.push(resumeChar.repeat(width - leftLength.size));
    }
    return lines.join(glue);
  }

  protected getBarParts(
    size: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    progress: IProgress,
  ): { left: string; done: string } {
    return {
      done: this.options.completeChar.repeat(size),
      left: this.options.resumeChar.repeat(this.options.width - size),
    };
  }

  protected getDataValue = (key: string, item: IProgress): string | null => {
    const payload = item.getPayload();
    let value = payload[key] ?? null;
    value =
      value === null && this.dataProviders[key]
        ? this.dataProviders[key](item, this.progresses)
        : value;
    if (value === null) return value;
    return value;
  };
}
