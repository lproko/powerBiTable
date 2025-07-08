import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
export declare class Visual implements IVisual {
    private target;
    private formattingSettings;
    private formattingSettingsService;
    private root;
    private host;
    private selectionManager;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): Promise<void>;
    private transformData;
    getFormattingModel(): powerbi.visuals.FormattingModel;
}
