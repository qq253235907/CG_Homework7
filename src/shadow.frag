#version 330 core

out vec4 FragColor;

in VS_OUT {
    vec3 FragPos;
    vec3 Normal;
    vec2 TexCoords;
    vec4 FragPosLightSpace;
} fs_in;

uniform sampler2D diffuseTexture;
uniform sampler2D shadowMap;

uniform vec3 lightPos;
uniform vec3 viewPos;
uniform vec3 objectColor;


float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // 执行透视算法，将将w转化为(-1, 1)
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // 从(-1,1)变换到(0,1)
    projCoords = projCoords * 0.5 + 0.5;
    // 得到光的位置视野下最近的深度
    float closestDepth = texture(shadowMap, projCoords.xy).r; 
    // 简单获取投影向量的z坐标，等于来自光的透视视角的片元的深度
    float currentDepth = projCoords.z;

    // 避免阴影失真
    // 使用点乘
    float bias = max(0.5 * (1.0 - dot(normal, lightDir)), 0.005);

    // 从纹理像素四周对深度贴图采样，并取其平均值
    float shadow = 0.0;
    vec2 texelSize = 1.0 / textureSize(shadowMap, 0);
    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r; 
            shadow += currentDepth - bias > pcfDepth  ? 1.0 : 0.0;
        }    
    }
    shadow /= 9.0;
    
    // 只投影向量的z坐标大于1.0则shadow的值强制设为0.0
    if(projCoords.z > 1.0){
        shadow = 0.0;
    }
    return shadow;
}

void main()
{           
    vec3 normal = normalize(fs_in.Normal);
    vec3 lightColor = vec3(0.5f);
    // ambient环境光
    vec3 ambient = 0.4 * lightColor;
    // diffuse 漫反射
    vec3 lightDir = normalize(lightPos - fs_in.FragPos);
    float diff = max(dot(lightDir, normal), 0.0);
    vec3 diffuse = diff * lightColor;
    // specular 镜面
    vec3 viewDir = normalize(viewPos - fs_in.FragPos);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = 0.0;
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    spec = pow(max(dot(normal, halfwayDir), 0.0), 64.0);
    vec3 specular = spec * lightColor;    
    // 计算阴影
    float shadow = ShadowCalculation(fs_in.FragPosLightSpace, normal, lightDir);                      
    vec3 lighting = (ambient + (1.0 - shadow) * (diffuse + specular)) * objectColor;
    FragColor = vec4(lighting, 1.0);
}