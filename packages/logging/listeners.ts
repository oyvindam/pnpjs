import { ILogEntry, LogLevel, ILogListener } from "./logger";

/**
 * Implementation of LogListener which logs to the console
 *
 */
export class ConsoleListener implements ILogListener {

    /**
     * Any associated data that a given logging listener may choose to log or ignore
     *
     * @param entry The information to be logged
     */
    public log(entry: ILogEntry): void {

        const msg = this.format(entry);

        switch (entry.level) {
            case LogLevel.Verbose:
            case LogLevel.Info:
                console.log(msg);
                break;
            case LogLevel.Warning:
                console.warn(msg);
                break;
            case LogLevel.Error:
                console.error(msg);
                break;
        }
    }

    /**
     * Formats the message
     *
     * @param entry The information to format into a string
     */
    private format(entry: ILogEntry): string {
        const msg = [];
        msg.push("Message: " + entry.message);
        if (entry.data !== undefined) {
            try {
                msg.push(" Data: " + JSON.stringify(entry.data));
            } catch (e) {
                msg.push(` Data: Error in stringify of supplied data ${e}`);
            }
        }

        return msg.join("");
    }
}

/**
 * Implementation of LogListener which logs to the supplied function
 *
 */
export class FunctionListener implements ILogListener {

    /**
     * Creates a new instance of the FunctionListener class
     *
     * @constructor
     * @param  method The method to which any logging data will be passed
     */
    constructor(private method: (entry: ILogEntry) => void) { }

    /**
     * Any associated data that a given logging listener may choose to log or ignore
     *
     * @param entry The information to be logged
     */
    public log(entry: ILogEntry): void {
        this.method(entry);
    }
}
