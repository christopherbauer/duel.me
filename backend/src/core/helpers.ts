export const obfuscatePassword = (jsonObject: Record<string, any>) => {
	var jsonConstructor = {}.constructor;
	function checkProps(objectLevel: Record<string, any>) {
		var keys = Object.keys(objectLevel);
		if (keys) {
			keys.forEach((key) => {
				var curPropValue = objectLevel[key];
				if (key.match(/(password)+/gi)) {
					//Matches key password, case insensitive, and redacts the data
					objectLevel[key] = '[REDACTED BY LOGGING FRAMEWORK]';
				}
				if (curPropValue.constructor === jsonConstructor) {
					checkProps(curPropValue);
				}
			});
		}
	}
	checkProps(jsonObject);
	return jsonObject;
};
