export class IndustrialError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'IndustrialError';
    this.status = status;
    this.code = code;
  }
}

export class STILParsingError extends IndustrialError {
  constructor(message: string) {
    super(message, 422, 'STIL_PARSING_FAILURE');
  }
}

export class SimulationError extends IndustrialError {
  constructor(message: string) {
    super(message, 500, 'SCAN_SIMULATION_FAILURE');
  }
}

export class DatabaseError extends IndustrialError {
  constructor(message: string) {
    super(message, 503, 'DB_UNAVAILABLE');
  }
}
