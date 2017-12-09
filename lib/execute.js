const path = require( 'path' );
const fs = require( 'fs' );
const os = require( 'os' );
const spawn = require( 'child_process' ).spawn;

const binPath = path.join( __dirname, 'bin' );

const optionDefaults = {
	'resize-kernel': 'linear',
	'rotation-enabled': true,
	'padding': 2,
	'trim-enabled': true,
	'boundary-alignment': 0,
	'trim-enabled': true,
	'trim-boundary-alignment': 0,
	'output': 'default',
	'output-width': 8192,
	'output-height': 8192,
	'output-pow2': true,
	'output-json': true,
	'output-image': true,
	'resolution': 1,
	'scale-manifest-values': false,
	'fail-if-too-big': false,
	'input-files': []
};

/**
 * @typedef {Object} executeBinaryResult
 * @property {number} exitCode - Exit code of process
 * @property {string} stderr - Standard error
 * @property {string} stdout - Standard out
 */

/**
 * Executes the atlasbuilder binary, putting the arguments in a response text file first to get around Window's command line limit
 *
 * @param {string} exePath - Path to atlasbuilder binary
 * @param {Array.<string>} args - Array of arguments to pass to binary
 * @returns {executeBinaryResult}
 */
function executeBinary( exePath, args ) {
	const argsFilename = path.join( os.tmpdir(), 'response-' + Math.floor( Math.random() * 100000 ) + '.txt' );
	return new Promise( ( resolve, reject ) => {
		let stderr = '';
		let stdout = '';
		fs.writeFileSync( argsFilename, args.join( "\n" ), 'utf8' );
		const proc = spawn( exePath, [`@${argsFilename}`], { cwd: process.cwd() } );
		proc.stderr.on( 'data', ( data ) => {
			stderr += data.toString();
		} );
		proc.stdout.on( 'data', ( data ) => {
			stdout += data.toString();
		} );
		proc.on( 'error', ( err ) => {
			fs.unlinkSync( argsFilename );
			reject( err );
		} );
		proc.on( 'exit', ( exitCode ) => {
			fs.unlinkSync( argsFilename );
			if ( typeof exitCode === 'number' && exitCode !== 0 ) {
				reject( new Error( `Texture generation failed with exitcode ${exitCode}. Error "${stderr}" stdout "${stdout}"` ) );
			} else {
				resolve( {
					exitCode,
					stderr,
					stdout
				} );
			}
		} );
	} );
}

function start( options ) {
	const exePath = path.join( binPath, 'atlasbuilder', os.platform(), os.arch(), 'atlasbuilder' + ( os.platform() === 'win32' ? '.exe' : '' ) );
	options = Object.assign( {}, optionDefaults, options );
	const args = [];
	for ( const key in options ) {
		if ( options.hasOwnProperty( key ) && key !== 'input-files' ) {
			args.push( `--${key}=${options[key]}` );
		}
	}
	for ( const index=0; index<options['input-files'].length; ++index ) {
		args.push( options['input-files'][index] );
	}
	return executeBinary( exePath, args );
}

module.exports = start;
