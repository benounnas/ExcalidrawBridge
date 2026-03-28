# CI/CD Pipeline

## Prompt

Draw a CI/CD pipeline flowing left to right. Start with a "Developer" icon pushing code to a "Git Repo" box. From there, an arrow triggers "Build" (compile + docker image), then "Unit Tests", then "Integration Tests". After tests pass, it flows to "Staging Deploy" with a dotted arrow to a "QA Review" diamond decision. If approved, it flows to "Production Deploy". If rejected, an arrow loops back to "Developer". Color the build/test stages in light purple, deployments in light green, and the decision in light yellow. Add a light blue background zone labeled "CI" over the build and test stages, and a light green zone labeled "CD" over the deployment stages.

## Excalidraw JSON

[CI_CD Pipeline.excalidraw](excalidraw-jsons/CI_CD%20Pipeline.excalidraw)
