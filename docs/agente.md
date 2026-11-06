# Por que vtex-migrator es como es

## Un solo agente, no uno por camino

Los tres caminos comparten el diagnóstico y la mitad del mapa: Legacy a FastStore es, en la práctica, el inventario de
Legacy a Store Framework con la construcción de Store Framework a FastStore. Tres agentes repetirían lo mismo y
obligarían a quien los usa a saber de antemano en que generación está, que es justamente lo que el agente averigua.

## Por que escribe código, cuando los agentes de vtex-io-agents no

Una migración termina en un storefront nuevo. Un agente que solo planea deja el trabajo a mitad de camino. A cambio,
la escritura tiene límites duros: una rama propia, el código nuevo separado del viejo, nada en `main` ni `master`, y
ninguna acción sobre la tienda real (`vtex publish`, `vtex workspace promote`, DNS, tickets, schema del CMS en
producción). El gate exige que esas prohibiciones estén escritas en el agente.

## Por que pregunta antes de planear

El destino no sale del código: depende del presupuesto, de la fecha de salida, de si la tienda es B2B y de cuantos
idiomas tiene. El agente propone y recomienda, pero no elige. Como subagente no puede preguntar, así que se detiene
y devuelve las preguntas.

## Por que estas cuatro skills precargadas

`vtex-io-storefront-theme-app` y `vtex-io-render-runtime-and-blocks` cubren el destino Store Framework y el origen
cuando la tienda ya está en IO. `faststore-storefront` cubre el destino FastStore. `architecture-well-architected-commerce`
sostiene las decisiones de plan: que se reutiliza, que se rehace y donde vive cada dato. El resto entra bajo demanda
con el tool `Skill`, para no gastar contexto en lo que el caso no pide.

## Por que todas las herramientas del servidor MCP

El diagnóstico necesita la documentación (`search-concepts`, `explain-concept`, `search-courses`, `lookup-vtex-api`) y
la ejecución hacia Store Framework necesita el scaffolding (`scaffold-vtex-app`, `scaffold-node-service`,
`scaffold-graphql`, `add-block`) y las props de los blocks (`lookup-block-props`).

## Por que modelo grande

El error caro en una migración es de juicio: elegir mal que se reutiliza, olvidar las URLs o el contenido que no
migra solo. Eso vale más que el costo del modelo.
